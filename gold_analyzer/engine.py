"""Multi-timeframe voting engine."""
import warnings

import numpy as np
import pandas as pd

from . import indicators as ind
from .intermarket import PROFILES
from .registry import ANALYZERS, CATEGORIES

# medium-term (swing) profile: daily is the anchor, weekly the bias, 4h/1h the timing
TF_WEIGHTS = {"1h": 0.10, "4h": 0.25, "1d": 0.40, "1w": 0.25}
TF_NAMES = {"1h": "یک‌ساعته", "4h": "چهارساعته", "1d": "روزانه", "1w": "هفتگی"}


def run_timeframe(df, intermarket=None, use_intermarket=False, profile=None):
    """Run every analyzer on one timeframe.

    Returns (votes DataFrame [bars x analyzers], info dict per analyzer).
    """
    votes, info = {}, {}
    for key, (name, cat, fn) in ANALYZERS.items():
        try:
            v, note = fn(df)
        except Exception as e:  # one broken analyzer must not kill the report
            v, note = pd.Series(0.0, index=df.index), f"error: {e}"
        votes[key] = v.reindex(df.index).fillna(0).clip(-1, 1)
        info[key] = {"name": name, "category": cat, "note": note,
                     "available": note != "no volume data" and not note.startswith("error")}
    if use_intermarket and intermarket and profile in PROFILES:
        for src, _ticker, key, name, fn in PROFILES[profile]:
            if src not in intermarket:
                continue
            try:
                v, note = fn(df, intermarket[src])
                votes[key] = v.fillna(0)
                info[key] = {"name": name, "category": "intermarket", "note": note, "available": True}
            except Exception as e:
                warnings.warn(f"intermarket {key}: {e}")
    return pd.DataFrame(votes), info


def score_row(row, info):
    """Weighted score in [-1, 1] for one bar: average inside each category,
    then weighted average of categories (so 13 trend tools don't drown out SMC)."""
    cat_scores = {}
    for cat in CATEGORIES:
        keys = [k for k in row.index if info[k]["category"] == cat and info[k]["available"]]
        if keys:
            cat_scores[cat] = float(row[keys].mean())
    wsum = sum(CATEGORIES[c][1] for c in cat_scores)
    total = sum(CATEGORIES[c][1] * s for c, s in cat_scores.items()) / wsum if wsum else 0.0
    return total, cat_scores


def score_series(votes, info):
    """Same weighting as ``score_row`` but for every bar at once (for charts)."""
    num = den = 0
    for cat, (_, w) in CATEGORIES.items():
        keys = [k for k in votes if info[k]["category"] == cat and info[k]["available"]]
        if keys:
            num = num + w * votes[keys].mean(axis=1)
            den += w
    return num / den if den else votes.iloc[:, 0] * 0


def analyze(timeframes, intermarket=None, profile="gold"):
    """Run all analyzers on all timeframes and aggregate the latest votes."""
    result = {"timeframes": {}, "votes_history": {}}
    total, wsum = 0.0, 0.0
    counts = {"buy": 0, "sell": 0, "wait": 0}
    for tf, df in timeframes.items():
        use_im = tf in ("1d", "1w")
        votes, info = run_timeframe(df, intermarket, use_intermarket=use_im, profile=profile)
        last = votes.iloc[-1]
        score, cats = score_row(last, info)
        rows = []
        tf_counts = {"buy": 0, "sell": 0, "wait": 0}
        for k, v in last.items():
            if not info[k]["available"]:
                continue
            lab = "buy" if v > 0 else "sell" if v < 0 else "wait"
            tf_counts[lab] += 1
            counts[lab] += 1
            rows.append({"key": k, **info[k], "vote": int(v)})
        w = TF_WEIGHTS.get(tf, 0.2)
        total += w * score
        wsum += w
        result["timeframes"][tf] = {"score": score, "categories": cats, "counts": tf_counts,
                                    "rows": rows, "close": float(df["close"].iloc[-1]),
                                    "time": str(df.index[-1]), "weight": w,
                                    "atr": float(ind.atr(df).iloc[-1])}
        result["votes_history"][tf] = (votes, info)
    result["vote_score"] = total / wsum if wsum else 0.0
    result["counts"] = counts
    return result


def analyzer_hit_rates(df, votes, horizon=10):
    """How often each analyzer's non-zero vote matched the sign of the next ``horizon``-bar move."""
    fwd = np.sign(df["close"].shift(-horizon) / df["close"] - 1)
    out = {}
    valid = fwd.notna()
    for k in votes:
        m = (votes[k] != 0) & valid
        if m.sum() >= 30:
            out[k] = (float((votes[k][m] == fwd[m]).mean()), int(m.sum()))
    return out
