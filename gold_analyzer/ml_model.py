"""Machine-learning meta-model.

Learns, from history, how the votes of all analyzers (daily + weekly) and a
few raw indicator values translate into the market move over the next
``horizon`` daily bars, then gives BUY / SELL / WAIT probabilities for today.

Validation is walk-forward (expanding window with a gap = horizon) so no
future information leaks into the reported accuracy.

scikit-learn is optional: without it (e.g. on Termux) a pure-NumPy
softmax regression is used instead.
"""
import warnings

import numpy as np
import pandas as pd

from . import indicators as ind

try:
    from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier, VotingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

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


class NumpySoftmax:
    """Multinomial logistic regression (L2, full-batch gradient descent) – sklearn-free fallback."""

    def __init__(self, l2=0.1, lr=0.3, epochs=400):
        self.l2, self.lr, self.epochs = l2, lr, epochs

    def fit(self, X, y):
        X = np.asarray(X, float)
        self.mu, self.sd = X.mean(0), X.std(0)
        self.sd[self.sd < 1e-6] = 1.0  # constant columns must not explode at predict time
        Z = self._z(X)
        self.classes_ = np.unique(y)
        Y = (np.asarray(y)[:, None] == self.classes_[None]).astype(float)
        cw = len(Y) / (len(self.classes_) * Y.sum(0))  # balanced class weights
        W = np.zeros((Z.shape[1], len(self.classes_)))
        b = np.zeros(len(self.classes_))
        for _ in range(self.epochs):
            P = self._softmax(Z @ W + b)
            G = (P - Y) * (Y @ cw)[:, None] / len(Z)
            W -= self.lr * (Z.T @ G + self.l2 * W)
            b -= self.lr * G.sum(0)
        self.W, self.b = W, b
        self.feature_importances_ = np.abs(W).mean(1) / np.abs(W).mean(1).sum()
        return self

    @staticmethod
    def _softmax(a):
        a = a - a.max(1, keepdims=True)
        e = np.exp(a)
        return e / e.sum(1, keepdims=True)

    def _z(self, X):
        return np.clip((np.asarray(X, float) - self.mu) / self.sd, -5, 5)

    def predict_proba(self, X):
        return self._softmax(self._z(X) @ self.W + self.b)

    def predict(self, X):
        return self.classes_[self.predict_proba(X).argmax(1)]


def walk_forward_splits(n, splits=5, gap=10):
    """Expanding-window train/test index pairs (like sklearn's TimeSeriesSplit with gap)."""
    test = n // (splits + 1)
    for k in range(splits):
        start = n - (splits - k) * test
        yield np.arange(0, max(start - gap, 1)), np.arange(start, start + test)


def model_name():
    return "RandomForest + GradientBoosting + Logistic (soft vote)" if HAS_SKLEARN else "NumPy softmax regression"


def _importances(mdl, columns):
    est = mdl.named_estimators_["rf"] if HAS_SKLEARN else mdl
    return pd.Series(est.feature_importances_, index=columns).sort_values(ascending=False)


def make_model():
    if not HAS_SKLEARN:
        return NumpySoftmax()
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
        raise RuntimeError(f"not enough daily history for ML: {len(Xl) + warmup} daily bars, need ~600+")

    # ---- walk-forward validation
    preds, truth, moves = [], [], []
    base_hits = []
    for tr, te in walk_forward_splits(len(Xl), splits, horizon):
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
    up_rate = float((mv > 0).mean())  # how often price simply went up (what a "buy" is up against)
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
    imp = _importances(mdl, X.columns)

    return {
        "model": model_name(),
        "p_buy": float(proba.get(1, 0)), "p_wait": float(proba.get(0, 0)), "p_sell": float(proba.get(-1, 0)),
        "cv_accuracy": acc, "up_rate": up_rate, "baseline_accuracy": float(np.mean(base_hits)),
        "buy_precision": buy_prec, "sell_precision": sell_prec, "avg_trade_pct": avg_trade,
        "n_buy_calls": int((p == 1).sum()), "n_sell_calls": int((p == -1).sum()),
        "n_samples": int(len(Xl)), "n_features": int(X.shape[1]),
        "top_features": imp.head(10).round(4).to_dict(),
        "label_balance": yl.value_counts(normalize=True).round(3).rename(index=LABELS).to_dict(),
    }


def ml_trust(res, direction):
    """How much weight the model deserves, judged only on its out-of-sample record.

    ``direction`` is the sign of today's prediction (+1 up, -1 down, 0 flat):
    a model whose past calls in that direction were worse than chance gets 0.
    Returns {"weight", "reliable", "reasons"}.
    """
    reasons = []
    edge = res["cv_accuracy"] - res["baseline_accuracy"]
    up = res.get("up_rate", 0.5)
    buy_edge = res["buy_precision"] - up if not np.isnan(res["buy_precision"]) else np.nan
    sell_edge = res["sell_precision"] - (1 - up) if not np.isnan(res["sell_precision"]) else np.nan
    if edge <= 0:
        reasons.append(f"دقت کل مدل ({res['cv_accuracy']*100:.1f}%) از حدس ساده ({res['baseline_accuracy']*100:.1f}%) بهتر نیست")
    if not np.isnan(res["avg_trade_pct"]) and res["avg_trade_pct"] <= 0:
        reasons.append("پیروی از سیگنال‌های مدل در گذشته سودی نداشته")
    dir_edge = buy_edge if direction > 0 else sell_edge if direction < 0 else np.nan
    if direction != 0 and (np.isnan(dir_edge) or dir_edge <= 0):
        side = "خرید" if direction > 0 else "فروش"
        base = up if direction > 0 else 1 - up
        prec = res["buy_precision"] if direction > 0 else res["sell_precision"]
        reasons.append(f"سیگنال‌های {side} مدل در گذشته ({prec*100:.1f}% درست) از نرخ پایه بازار ({base*100:.1f}%) بهتر نبوده‌اند")
    if reasons:
        return {"weight": 0.0, "reliable": False, "reasons": reasons}
    edges = [x for x in (buy_edge, sell_edge) if not np.isnan(x)]
    mean_edge = float(np.mean(edges)) if edges else 0.0
    if edge > 0.03 and mean_edge > 0.03:
        w = 0.5
    elif mean_edge > 0.01:
        w = 0.35
    else:
        w = 0.15
    return {"weight": w, "reliable": True, "reasons": [f"مدل از حدس ساده {edge*100:.1f} واحد درصد دقیق‌تر بوده"]}
