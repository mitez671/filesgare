"""One entry point used by the CLI, the web server and the HTML export.

``run()`` does the full analysis; ``to_payload()`` turns it into a
JSON-safe dict that also carries chart data for the web UI.
"""
import math
import time

import numpy as np
import pandas as pd

from . import data, engine, ml_model, report
from . import indicators as ind
from .engine import TF_NAMES
from .registry import CATEGORIES
from .smc import order_block_zones

CHART_BARS = {"1h": 300, "4h": 300, "1d": 300, "1w": 260}


def run(symbol="GC=F", source="yahoo", csv=None, horizon=10, use_ml=True, use_intermarket=True, log=print):
    t0 = time.time()
    intermarket = {}
    log("در حال دریافت داده...")
    if source == "demo":
        hourly, daily, intermarket = data.synthetic()
        symbol = "DEMO (synthetic)"
    elif source == "csv":
        hourly, daily = data.load_csv(csv)
    elif source == "mt5":
        hourly, daily = data.load_mt5(symbol)
    else:
        hourly, daily = data.load_yahoo(symbol)
    if source != "demo" and use_intermarket:
        intermarket = data.load_intermarket_yahoo()
    if not use_intermarket:
        intermarket = {}

    tfs = data.build_timeframes(hourly, daily)
    log("در حال اجرای اندیکاتورها و تحلیل‌ها روی تایم‌فریم‌های " + ", ".join(tfs) + " ...")
    res = engine.analyze(tfs, intermarket)
    d_votes, _ = res["votes_history"]["1d"]
    hit = engine.analyzer_hit_rates(tfs["1d"], d_votes, horizon)

    ml, w_ml, ml_error = None, 0.0, None
    if use_ml:
        log("در حال آموزش مدل یادگیری ماشین (walk-forward)...")
        try:
            w_votes, _ = res["votes_history"]["1w"]
            X, y, fwd = ml_model.build_dataset(tfs["1d"], d_votes, tfs["1w"], w_votes, intermarket, horizon=horizon)
            ml = ml_model.train_and_predict(X, y, fwd, horizon=horizon)
            w_ml = ml_model.ml_weight(ml)
        except Exception as e:
            ml_error = str(e)
            log(f"(ML اجرا نشد: {e})")
    decision = report.decide(res, ml, w_ml)
    return {"symbol": symbol, "horizon": horizon, "tfs": tfs, "res": res, "hit": hit, "ml": ml,
            "ml_error": ml_error, "decision": decision, "elapsed": time.time() - t0}


# ---------------------------------------------------------------- JSON payload
def _js(o):
    """Recursively make numpy / NaN values JSON-safe."""
    if isinstance(o, dict):
        return {str(k): _js(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_js(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        o = float(o)
        return None if math.isnan(o) or math.isinf(o) else round(o, 5)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o


def _series(idx_secs, s):
    # NaN bars stay as whitespace points so every pane has the same bar count (keeps panes in sync)
    return [{"time": t} if v is None or math.isnan(v) else {"time": t, "value": v}
            for t, v in zip(idx_secs, s.tolist())]


def _levels(df):
    """Key horizontal levels drawn on the chart."""
    lv = []
    c = df["close"].iloc[-1]
    _, bull_ob, bear_ob = order_block_zones(df)
    if bull_ob:
        lv.append({"price": bull_ob[1], "low": bull_ob[0], "label": "Bull OB", "kind": "buy"})
    if bear_ob:
        lv.append({"price": bear_ob[0], "high": bear_ob[1], "label": "Bear OB", "kind": "sell"})
    sh, sl = ind.swing_points(df, 3)
    recent = df.index[-150:]
    highs = sh.reindex(recent).dropna()
    lows = sl.reindex(recent).dropna()
    above = highs[highs > c]
    below = lows[lows < c]
    if len(above):
        lv.append({"price": float(above.min()), "label": "Resistance", "kind": "sell"})
    if len(below):
        lv.append({"price": float(below.max()), "label": "Support", "kind": "buy"})
    hi, lo = df["high"].iloc[-100:].max(), df["low"].iloc[-100:].min()
    up_leg = df["low"].iloc[-100:].values.argmin() < df["high"].iloc[-100:].values.argmax()
    for r in (0.382, 0.5, 0.618):
        p = hi - r * (hi - lo) if up_leg else lo + r * (hi - lo)
        lv.append({"price": float(p), "label": f"Fib {r}", "kind": "fib"})
    return lv


def _chart(df, votes, info, n=300):
    c = df["close"]
    score = engine.score_series(votes, info)
    up, _, lo = ind.bollinger(c)
    _, _, hist = ind.macd(c)
    st = ind.supertrend(df)
    tail = df.index[-n:]
    secs = [int(pd.Timestamp(t).timestamp()) for t in tail]

    def cut(s):
        return s.reindex(tail).astype(float).round(4)

    candles = [{"time": t, "open": o, "high": h, "low": l, "close": cc}
               for t, o, h, l, cc in zip(secs, *(df[x].reindex(tail).round(4).tolist() for x in ("open", "high", "low", "close")))]
    # markers where the composite score enters a buy (>= +0.3) / sell (<= -0.3) regime;
    # hysteresis (leave only below |0.1|) stops the arrows from flickering
    sc = cut(score)
    markers = []
    state = 0
    for t, v in zip(secs, sc.tolist()):
        if math.isnan(v):
            continue
        new = 1 if v >= 0.3 else -1 if v <= -0.3 else (0 if abs(v) < 0.1 or v * state < 0 else state)
        if new != state and new != 0:
            markers.append({"time": t, "position": "belowBar" if new > 0 else "aboveBar",
                            "color": "#16a34a" if new > 0 else "#dc2626",
                            "shape": "arrowUp" if new > 0 else "arrowDown", "text": "B" if new > 0 else "S"})
        state = new
    return {
        "candles": candles,
        "ema20": _series(secs, cut(ind.ema(c, 20))),
        "ema50": _series(secs, cut(ind.ema(c, 50))),
        "ema200": _series(secs, cut(ind.ema(c, 200))),
        "bb_up": _series(secs, cut(up)),
        "bb_lo": _series(secs, cut(lo)),
        "rsi": _series(secs, cut(ind.rsi(c))),
        "macd_hist": _series(secs, cut(hist)),
        "score": _series(secs, sc),
        "supertrend": cut(st).tolist()[-1] if len(st) else 0,
        "markers": markers,
        "levels": _levels(df),
    }


def to_payload(r):
    res, dec = r["res"], r["decision"]
    tfs = {}
    for tf, t in res["timeframes"].items():
        votes, info = res["votes_history"][tf]
        tfs[tf] = {
            "name": TF_NAMES.get(tf, tf), "score": t["score"], "weight": t["weight"], "close": t["close"],
            "time": t["time"], "atr": t["atr"], "counts": t["counts"], "categories": t["categories"],
            "rows": [{**row, "hit": (r["hit"].get(row["key"], (None,))[0] if tf == "1d" else None)} for row in t["rows"]],
            "chart": _chart(r["tfs"][tf], votes, info, CHART_BARS.get(tf, 300)),
        }
    return _js({
        "symbol": r["symbol"], "horizon": r["horizon"], "generated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
        "elapsed": r["elapsed"], "decision": dec, "vote_score": res["vote_score"], "counts": res["counts"],
        "categories": {k: v[0] for k, v in CATEGORIES.items()}, "timeframes": tfs,
        "ml": r["ml"], "ml_error": r["ml_error"],
    })
