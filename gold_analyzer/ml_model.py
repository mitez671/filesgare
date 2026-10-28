"""Machine-learning meta-model.

Learns, from history, how the votes of all analyzers (daily + weekly) and a
few raw indicator values translate into the market move over the next
``horizon`` daily bars, then gives BUY / SELL / WAIT probabilities for today.

Validation is walk-forward (TimeSeriesSplit with a gap = horizon) so no
future information leaks into the reported accuracy.
"""
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from . import indicators as ind

LABELS = {1: "BUY", 0: "WAIT", -1: "SELL"}


def raw_features(df, prefix):
    c = df["close"]
    a = ind.atr(df)
    m, s, h = ind.macd(c)
    adx, pdi, mdi = ind.adx(df)
    up, mid, lo = ind.bollinger(c)
    f = pd.DataFrame(index=df.index)
    f["rsi"] = ind.rsi(c)
    f["adx"] = adx
    f["di_diff"] = pdi - mdi
    f["macd_hist_atr"] = h / a
    f["dist_ema50_atr"] = (c - ind.ema(c, 50)) / a
    f["dist_ema200_atr"] = (c - ind.ema(c, 200)) / a
    f["roc5"] = ind.roc(c, 5)
    f["roc20"] = ind.roc(c, 20)
    f["atr_pct"] = a / c * 100
    f["bb_pctb"] = (c - lo) / (up - lo)
    f["stoch_k"] = ind.stochastic(df)[0]
    return f.add_prefix(prefix)


def build_dataset(daily, d_votes, weekly=None, w_votes=None, intermarket=None, horizon=10, k=0.5):
    X = pd.concat([d_votes.add_prefix("d_"), raw_features(daily, "d_raw_")], axis=1)
    if weekly is not None:
        wx = pd.concat([w_votes.add_prefix("w_"), raw_features(weekly, "w_raw_")], axis=1)
        # weekly bar is stamped with its closing Friday -> forward fill = no look-ahead
        X = X.join(wx.reindex(daily.index, method="ffill"))
    for key, other in (intermarket or {}).items():
        o = other["close"].reindex(daily.index, method="ffill")
        X[f"im_{key}_roc20"] = o.pct_change(20, fill_method=None) * 100
    # target: move over the next `horizon` bars vs. a volatility-scaled threshold
    fwd = daily["close"].shift(-horizon) / daily["close"] - 1
    thr = k * daily["close"].pct_change().rolling(20).std() * np.sqrt(horizon)
    y = pd.Series(0.0, index=daily.index)
    y[fwd > thr] = 1
    y[fwd < -thr] = -1
    y[fwd.isna()] = np.nan
    X = X.replace([np.inf, -np.inf], np.nan)
    return X, y, fwd


def make_model():
    return VotingClassifier(
        estimators=[
            ("rf", RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=20,
                                          class_weight="balanced_subsample", n_jobs=-1, random_state=1)),
            ("gb", HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200,
                                                  l2_regularization=1.0, random_state=1)),
            ("lr", make_pipeline(StandardScaler(), LogisticRegression(C=0.3, max_iter=2000, class_weight="balanced"))),
        ],
        voting="soft",
    )


def train_and_predict(X, y, fwd, horizon=10, splits=5, warmup=200):
    X = X.iloc[warmup:].ffill().fillna(0)
    y, fwd = y.iloc[warmup:], fwd.iloc[warmup:]
    labeled = y.notna()
    Xl, yl, fl = X[labeled], y[labeled].astype(int), fwd[labeled]
    if len(Xl) < 400:
        raise RuntimeError("not enough daily history for ML (need ~600+ daily bars)")

    # ---- walk-forward validation
    preds, truth, moves = [], [], []
    base_hits = []
    for tr, te in TimeSeriesSplit(n_splits=splits, gap=horizon).split(Xl):
        mdl = make_model()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            mdl.fit(Xl.iloc[tr], yl.iloc[tr])
        p = mdl.predict(Xl.iloc[te])
        preds.append(p)
        truth.append(yl.iloc[te].values)
        moves.append(fl.iloc[te].values)
        base_hits.append((yl.iloc[te] == yl.iloc[tr].mode()[0]).mean())
    p, t, mv = np.concatenate(preds), np.concatenate(truth), np.concatenate(moves)
    acc = float((p == t).mean())
    buy_prec = float((mv[p == 1] > 0).mean()) if (p == 1).any() else np.nan
    sell_prec = float((mv[p == -1] < 0).mean()) if (p == -1).any() else np.nan
    # average return per trade if we had followed the model's BUY/SELL calls
    trade_ret = np.where(p == 1, mv, np.where(p == -1, -mv, np.nan))
    avg_trade = float(np.nanmean(trade_ret) * 100) if np.isfinite(trade_ret).any() else np.nan

    # ---- final fit on all labelled history, predict today (last row, label unknown)
    mdl = make_model()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        mdl.fit(Xl, yl)
    proba = dict(zip(mdl.classes_, mdl.predict_proba(X.iloc[[-1]])[0]))
    rf = mdl.named_estimators_["rf"]
    imp = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False)

    return {
        "p_buy": float(proba.get(1, 0)), "p_wait": float(proba.get(0, 0)), "p_sell": float(proba.get(-1, 0)),
        "cv_accuracy": acc, "baseline_accuracy": float(np.mean(base_hits)),
        "buy_precision": buy_prec, "sell_precision": sell_prec, "avg_trade_pct": avg_trade,
        "n_buy_calls": int((p == 1).sum()), "n_sell_calls": int((p == -1).sum()),
        "n_samples": int(len(Xl)), "n_features": int(X.shape[1]),
        "top_features": imp.head(10).round(4).to_dict(),
        "label_balance": yl.value_counts(normalize=True).round(3).rename(index=LABELS).to_dict(),
    }


def ml_weight(res):
    """Trust the model more when its out-of-sample directional precision is better."""
    precs = [x for x in (res["buy_precision"], res["sell_precision"]) if not np.isnan(x)]
    if not precs:
        return 0.15
    prec = float(np.mean(precs))
    edge = res["cv_accuracy"] - res["baseline_accuracy"]
    if prec >= 0.56 and edge > 0:
        return 0.5
    if prec >= 0.52:
        return 0.35
    return 0.15
