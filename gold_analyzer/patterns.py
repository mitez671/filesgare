"""Price-action analyzers: candlestick patterns, chart patterns,
support/resistance, Fibonacci, pivot points and volume profile."""
import numpy as np
import pandas as pd

from . import indicators as ind

BUY, SELL, WAIT = 1, -1, 0


def _hold(sig, bars):
    return sig.replace(0, np.nan).ffill(limit=bars - 1).fillna(0)


def candlestick_patterns(df):
    o, h, l, c = df["open"], df["high"], df["low"], df["close"]
    body = (c - o).abs()
    rng = (h - l).replace(0, np.nan)
    upper = h - np.maximum(o, c)
    lower = np.minimum(o, c) - l
    down_ctx = c.shift() < ind.sma(c, 10).shift()  # pattern appears after a decline
    up_ctx = c.shift() > ind.sma(c, 10).shift()
    bull, bear = c > o, c < o
    pats = {
        "Bullish Engulfing": (bull & bear.shift() & (c >= o.shift()) & (o <= c.shift()) & down_ctx, BUY),
        "Bearish Engulfing": (bear & bull.shift() & (c <= o.shift()) & (o >= c.shift()) & up_ctx, SELL),
        "Hammer": ((lower > 2 * body) & (upper < body) & (body / rng > 0.1) & down_ctx, BUY),
        "Shooting Star": ((upper > 2 * body) & (lower < body) & (body / rng > 0.1) & up_ctx, SELL),
        "Morning Star": (bear.shift(2) & (body.shift() < body.shift(2) * 0.4) & bull
                         & (c > (o.shift(2) + c.shift(2)) / 2) & down_ctx.shift(), BUY),
        "Evening Star": (bull.shift(2) & (body.shift() < body.shift(2) * 0.4) & bear
                         & (c < (o.shift(2) + c.shift(2)) / 2) & up_ctx.shift(), SELL),
        "Three White Soldiers": (bull & bull.shift() & bull.shift(2) & (c > c.shift()) & (c.shift() > c.shift(2))
                                 & (body > 0.6 * rng), BUY),
        "Three Black Crows": (bear & bear.shift() & bear.shift(2) & (c < c.shift()) & (c.shift() < c.shift(2))
                              & (body > 0.6 * rng), SELL),
    }
    sig = pd.Series(0.0, index=df.index)
    name = pd.Series("", index=df.index)
    for nm, (cond, d) in pats.items():
        cond = cond.fillna(False).astype(bool)
        sig[cond] = d
        name[cond] = nm
    v = _hold(sig, 3)
    recent = name.iloc[-3:][name.iloc[-3:] != ""]
    return v, (", ".join(recent.values) if len(recent) else "no pattern in last 3 bars")


def _swings_list(df, k=3):
    sh, sl = ind.swing_points(df, k)
    return sh.values, sl.values


def higher_highs_lows(df):
    """Dow theory: HH+HL = uptrend, LH+LL = downtrend."""
    sh, sl = _swings_list(df)
    v = np.zeros(len(df))
    highs, lows = [], []
    for i in range(len(df)):
        if not np.isnan(sh[i]):
            highs = (highs + [sh[i]])[-2:]
        if not np.isnan(sl[i]):
            lows = (lows + [sl[i]])[-2:]
        if len(highs) == 2 and len(lows) == 2:
            if highs[1] > highs[0] and lows[1] > lows[0]:
                v[i] = BUY
            elif highs[1] < highs[0] and lows[1] < lows[0]:
                v[i] = SELL
    lab = {1: "HH + HL (uptrend)", -1: "LH + LL (downtrend)", 0: "mixed structure"}
    return pd.Series(v, index=df.index), lab[int(v[-1])]


def double_top_bottom(df, tol_atr=0.6, hold=10):
    sh, sl = _swings_list(df)
    a = ind.atr(df).values
    c = df["close"].values
    sig = np.zeros(len(df))
    highs, lows = [], []  # (idx, price)
    pending = None  # (direction, neckline, expiry)
    for i in range(len(df)):
        if not np.isnan(sh[i]):
            highs = (highs + [(i, sh[i])])[-2:]
            if len(highs) == 2 and not np.isnan(a[i]) and abs(highs[1][1] - highs[0][1]) < tol_atr * a[i]:
                neck = df["low"].values[highs[0][0] - 3:i - 3 + 1].min()
                pending = (SELL, neck, i + 30)
        if not np.isnan(sl[i]):
            lows = (lows + [(i, sl[i])])[-2:]
            if len(lows) == 2 and not np.isnan(a[i]) and abs(lows[1][1] - lows[0][1]) < tol_atr * a[i]:
                neck = df["high"].values[lows[0][0] - 3:i - 3 + 1].max()
                pending = (BUY, neck, i + 30)
        if pending and i <= pending[2]:
            d, neck, _ = pending
            if (d == BUY and c[i] > neck) or (d == SELL and c[i] < neck):
                sig[i], pending = d, None  # neckline broken -> pattern complete
        elif pending:
            pending = None
    v = _hold(pd.Series(sig, index=df.index), hold)
    return v, {1: "double bottom confirmed", -1: "double top confirmed"}.get(int(v.iloc[-1]), "none")


def support_resistance(df, look=150):
    """Bounce from clustered swing support / rejection from resistance."""
    sh, sl = _swings_list(df)
    a = ind.atr(df).values
    c, l, h = df["close"].values, df["low"].values, df["high"].values
    v = np.zeros(len(df))
    levels = []  # (idx, price)
    sup = res = np.nan
    for i in range(len(df)):
        for arr in (sh, sl):
            if not np.isnan(arr[i]):
                levels.append((i, arr[i]))
        levels = [x for x in levels if i - x[0] <= look]
        if np.isnan(a[i]) or not levels:
            continue
        prices = np.array([p for _, p in levels])
        below, above = prices[prices < c[i]], prices[prices > c[i]]
        sup = below.max() if len(below) else np.nan
        res = above.min() if len(above) else np.nan
        # level strength = how many swings sit within 0.5 ATR of it
        s_str = (np.abs(prices - sup) < 0.5 * a[i]).sum() if not np.isnan(sup) else 0
        r_str = (np.abs(prices - res) < 0.5 * a[i]).sum() if not np.isnan(res) else 0
        near_s = not np.isnan(sup) and l[i] - sup < 0.5 * a[i]
        near_r = not np.isnan(res) and res - h[i] < 0.5 * a[i]
        if near_s and not near_r and s_str >= 2:
            v[i] = BUY
        elif near_r and not near_s and r_str >= 2:
            v[i] = SELL
    return pd.Series(v, index=df.index), f"support≈{sup:.2f} resistance≈{res:.2f}"


def fibonacci_retracement(df, look=100):
    """Pull-back into the 0.5-0.618 'golden zone' of the last swing leg."""
    c = df["close"].values
    hi_idx = df["high"].rolling(look).apply(np.argmax, raw=True).values
    lo_idx = df["low"].rolling(look).apply(np.argmin, raw=True).values
    hi = df["high"].rolling(look).max().values
    lo = df["low"].rolling(look).min().values
    v = np.zeros(len(df))
    note = "n/a"
    for i in range(len(df)):
        if np.isnan(hi[i]):
            continue
        rng = hi[i] - lo[i]
        if rng <= 0:
            continue
        if lo_idx[i] < hi_idx[i]:  # up-leg: low came first
            r = (hi[i] - c[i]) / rng
            if 0.382 <= r <= 0.66:
                v[i] = BUY
            note = f"up-leg {lo[i]:.2f}->{hi[i]:.2f}, retrace {r*100:.0f}%"
        else:  # down-leg
            r = (c[i] - lo[i]) / rng
            if 0.382 <= r <= 0.66:
                v[i] = SELL
            note = f"down-leg {hi[i]:.2f}->{lo[i]:.2f}, retrace {r*100:.0f}%"
    return pd.Series(v, index=df.index), note


def pivot_points(df):
    """Classic floor pivots from the previous bar (previous day/week/...)."""
    ph, pl, pc = df["high"].shift(), df["low"].shift(), df["close"].shift()
    p = (ph + pl + pc) / 3
    r1, s1 = 2 * p - pl, 2 * p - ph
    c = df["close"]
    v = pd.Series(0.0, index=df.index)
    v[(c > p) & (c < r1)] = BUY
    v[c > r1] = BUY
    v[(c < p) & (c > s1)] = SELL
    v[c < s1] = SELL
    return v, f"P={p.iloc[-1]:.2f} R1={r1.iloc[-1]:.2f} S1={s1.iloc[-1]:.2f}"


def volume_profile(df, look=120, bins=40):
    """Value area (70%) of the last ``look`` bars: acceptance above VAH = bullish."""
    use_vol = ind.has_volume(df)
    tp = ((df["high"] + df["low"] + df["close"]) / 3).values
    vol = df["volume"].values if use_vol else np.ones(len(df))
    c = df["close"].values
    v = np.zeros(len(df))
    poc = vah = val = np.nan
    step = 1 if len(df) < 3000 else 3  # recompute less often on long intraday series
    for i in range(look, len(df)):
        if (i - look) % step == 0 or i == len(df) - 1:
            hist, edges = np.histogram(tp[i - look:i], bins=bins, weights=vol[i - look:i])
            mids = (edges[:-1] + edges[1:]) / 2
            order = np.argsort(hist)[::-1]
            cum = np.cumsum(hist[order]) / max(hist.sum(), 1e-12)
            va = mids[order[:np.searchsorted(cum, 0.7) + 1]]
            poc, vah, val = mids[order[0]], va.max(), va.min()
        if c[i] > vah:
            v[i] = BUY
        elif c[i] < val:
            v[i] = SELL
    return pd.Series(v, index=df.index), f"POC={poc:.2f} VAH={vah:.2f} VAL={val:.2f}"
