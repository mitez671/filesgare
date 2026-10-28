"""Raw technical-indicator math (pure pandas / numpy, no TA-Lib needed).

Every function takes a DataFrame with columns open/high/low/close/volume
(or a price Series) and returns Series aligned to the input index.
"""
import numpy as np
import pandas as pd


# ---------------------------------------------------------------- averages
def sma(s, n):
    return s.rolling(n, min_periods=n).mean()


def ema(s, n):
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def rma(s, n):
    """Wilder's smoothing (used by RSI / ATR / ADX)."""
    return s.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def wma(s, n):
    w = np.arange(1, n + 1, dtype=float)
    return s.rolling(n, min_periods=n).apply(lambda x: np.dot(x, w) / w.sum(), raw=True)


def hma(s, n=21):
    """Hull moving average."""
    return wma(2 * wma(s, n // 2) - wma(s, n), int(np.sqrt(n)))


# ---------------------------------------------------------------- volatility
def true_range(df):
    pc = df["close"].shift()
    return pd.concat([df["high"] - df["low"], (df["high"] - pc).abs(), (df["low"] - pc).abs()], axis=1).max(axis=1)


def atr(df, n=14):
    return rma(true_range(df), n)


def bollinger(s, n=20, k=2.0):
    mid = sma(s, n)
    sd = s.rolling(n, min_periods=n).std()
    return mid + k * sd, mid, mid - k * sd


def keltner(df, n=20, m=1.5):
    mid = ema(df["close"], n)
    a = atr(df, n)
    return mid + m * a, mid, mid - m * a


def donchian(df, n=20):
    return df["high"].rolling(n).max(), df["low"].rolling(n).min()


# ---------------------------------------------------------------- momentum
def rsi(s, n=14):
    d = s.diff()
    up = rma(d.clip(lower=0), n)
    dn = rma(-d.clip(upper=0), n)
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))


def macd(s, fast=12, slow=26, signal=9):
    line = ema(s, fast) - ema(s, slow)
    sig = ema(line, signal)
    return line, sig, line - sig


def stochastic(df, k=14, d=3, smooth=3):
    ll = df["low"].rolling(k).min()
    hh = df["high"].rolling(k).max()
    fast_k = 100 * (df["close"] - ll) / (hh - ll).replace(0, np.nan)
    slow_k = fast_k.rolling(smooth).mean()
    return slow_k, slow_k.rolling(d).mean()


def stoch_rsi(s, n=14, k=3, d=3):
    r = rsi(s, n)
    lo, hi = r.rolling(n).min(), r.rolling(n).max()
    st = 100 * (r - lo) / (hi - lo).replace(0, np.nan)
    kk = st.rolling(k).mean()
    return kk, kk.rolling(d).mean()


def cci(df, n=20):
    tp = (df["high"] + df["low"] + df["close"]) / 3
    m = tp.rolling(n).mean()
    md = tp.rolling(n).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    return (tp - m) / (0.015 * md.replace(0, np.nan))


def williams_r(df, n=14):
    hh = df["high"].rolling(n).max()
    ll = df["low"].rolling(n).min()
    return -100 * (hh - df["close"]) / (hh - ll).replace(0, np.nan)


def roc(s, n=12):
    return 100 * (s / s.shift(n) - 1)


def awesome_oscillator(df):
    med = (df["high"] + df["low"]) / 2
    return sma(med, 5) - sma(med, 34)


def trix(s, n=15):
    e = ema(ema(ema(s, n), n), n)
    return 100 * e.pct_change()


# ---------------------------------------------------------------- trend
def adx(df, n=14):
    up = df["high"].diff()
    dn = -df["low"].diff()
    pdm = pd.Series(np.where((up > dn) & (up > 0), up, 0.0), index=df.index)
    mdm = pd.Series(np.where((dn > up) & (dn > 0), dn, 0.0), index=df.index)
    a = atr(df, n).replace(0, np.nan)
    pdi = 100 * rma(pdm, n) / a
    mdi = 100 * rma(mdm, n) / a
    dx = 100 * (pdi - mdi).abs() / (pdi + mdi).replace(0, np.nan)
    return rma(dx, n), pdi, mdi


def aroon(df, n=25):
    up = df["high"].rolling(n + 1).apply(lambda x: x.argmax(), raw=True) / n * 100
    dn = df["low"].rolling(n + 1).apply(lambda x: x.argmin(), raw=True) / n * 100
    return up, dn


def ichimoku(df):
    def mid(n):
        return (df["high"].rolling(n).max() + df["low"].rolling(n).min()) / 2

    tenkan, kijun = mid(9), mid(26)
    span_a = ((tenkan + kijun) / 2).shift(26)
    span_b = mid(52).shift(26)
    return tenkan, kijun, span_a, span_b


def psar(df, step=0.02, max_step=0.2):
    high, low = df["high"].values, df["low"].values
    n = len(df)
    out = np.full(n, np.nan)
    trend = np.zeros(n)
    if n < 3:
        return pd.Series(out, index=df.index), pd.Series(trend, index=df.index)
    bull, af, ep, sar = True, step, high[0], low[0]
    for i in range(1, n):
        sar = sar + af * (ep - sar)
        if bull:
            sar = min(sar, low[i - 1], low[i - 2] if i > 1 else low[i - 1])
            if low[i] < sar:
                bull, sar, ep, af = False, ep, low[i], step
            elif high[i] > ep:
                ep, af = high[i], min(af + step, max_step)
        else:
            sar = max(sar, high[i - 1], high[i - 2] if i > 1 else high[i - 1])
            if high[i] > sar:
                bull, sar, ep, af = True, ep, high[i], step
            elif low[i] < ep:
                ep, af = low[i], min(af + step, max_step)
        out[i] = sar
        trend[i] = 1 if bull else -1
    return pd.Series(out, index=df.index), pd.Series(trend, index=df.index)


def supertrend(df, n=10, mult=3.0):
    a = atr(df, n).values
    hl2 = ((df["high"] + df["low"]) / 2).values
    close = df["close"].values
    upper, lower = hl2 + mult * a, hl2 - mult * a
    trend = np.zeros(len(df))
    fu, fl = upper.copy(), lower.copy()
    for i in range(1, len(df)):
        if np.isnan(a[i]):
            continue
        fu[i] = upper[i] if (np.isnan(fu[i - 1]) or upper[i] < fu[i - 1] or close[i - 1] > fu[i - 1]) else fu[i - 1]
        fl[i] = lower[i] if (np.isnan(fl[i - 1]) or lower[i] > fl[i - 1] or close[i - 1] < fl[i - 1]) else fl[i - 1]
        prev = trend[i - 1] if trend[i - 1] != 0 else 1
        if close[i] > fu[i - 1]:
            trend[i] = 1
        elif close[i] < fl[i - 1]:
            trend[i] = -1
        else:
            trend[i] = prev
    return pd.Series(trend, index=df.index)


def linreg_slope(s, n=50):
    """Normalised slope (% per bar) of a rolling least-squares line."""
    x = np.arange(n, dtype=float)
    xm = x.mean()
    denom = ((x - xm) ** 2).sum()
    slope = s.rolling(n).apply(lambda y: ((x - xm) * (y - y.mean())).sum() / denom, raw=True)
    return 100 * slope / s


# ---------------------------------------------------------------- volume
def has_volume(df):
    return "volume" in df and df["volume"].fillna(0).tail(200).sum() > 0


def obv(df):
    return (np.sign(df["close"].diff()).fillna(0) * df["volume"]).cumsum()


def mfi(df, n=14):
    tp = (df["high"] + df["low"] + df["close"]) / 3
    flow = tp * df["volume"]
    pos = flow.where(tp > tp.shift(), 0).rolling(n).sum()
    neg = flow.where(tp < tp.shift(), 0).rolling(n).sum()
    return 100 - 100 / (1 + pos / neg.replace(0, np.nan))


def cmf(df, n=20):
    rng = (df["high"] - df["low"]).replace(0, np.nan)
    mfm = ((df["close"] - df["low"]) - (df["high"] - df["close"])) / rng
    return (mfm * df["volume"]).rolling(n).sum() / df["volume"].rolling(n).sum().replace(0, np.nan)


def rolling_vwap(df, n=20):
    tp = (df["high"] + df["low"] + df["close"]) / 3
    return (tp * df["volume"]).rolling(n).sum() / df["volume"].rolling(n).sum().replace(0, np.nan)


# ---------------------------------------------------------------- alternative charts
def heikin_ashi(df):
    ha_close = (df["open"] + df["high"] + df["low"] + df["close"]) / 4
    ha_open = np.empty(len(df))
    ha_open[0] = (df["open"].iloc[0] + df["close"].iloc[0]) / 2
    hc = ha_close.values
    for i in range(1, len(df)):
        ha_open[i] = (ha_open[i - 1] + hc[i - 1]) / 2
    ha_open = pd.Series(ha_open, index=df.index)
    ha_high = pd.concat([df["high"], ha_open, ha_close], axis=1).max(axis=1)
    ha_low = pd.concat([df["low"], ha_open, ha_close], axis=1).min(axis=1)
    return pd.DataFrame({"open": ha_open, "high": ha_high, "low": ha_low, "close": ha_close})


def renko_direction(df, brick_atr_n=14):
    """Direction (+1/-1) of the most recent Renko brick at every bar (ATR-sized bricks)."""
    close = df["close"].values
    a = atr(df, brick_atr_n).values
    out = np.zeros(len(df))
    streak = np.zeros(len(df))
    base, direction, run = None, 0, 0
    for i in range(len(df)):
        if np.isnan(a[i]):
            continue
        box = a[i]
        if base is None:
            base = close[i]
            continue
        moved = (close[i] - base) / box
        if direction >= 0 and moved >= 1:
            k = int(moved)
            base += k * box
            run = run + k if direction == 1 else k
            direction = 1
        elif direction <= 0 and moved <= -1:
            k = int(-moved)
            base -= k * box
            run = run + k if direction == -1 else k
            direction = -1
        elif direction == 1 and moved <= -2:  # reversal needs 2 bricks
            k = int(-moved) - 1
            base -= (k + 1) * box
            direction, run = -1, k
        elif direction == -1 and moved >= 2:
            k = int(moved) - 1
            base += (k + 1) * box
            direction, run = 1, k
        out[i] = direction
        streak[i] = run
    return pd.Series(out, index=df.index), pd.Series(streak, index=df.index)


# ---------------------------------------------------------------- swings
def swing_points(df, k=3):
    """Fractal swing highs/lows.

    Returns two Series (swing_high, swing_low) holding the swing price at the
    bar where the swing becomes *confirmed* (k bars later), NaN elsewhere,
    so no future data leaks into historical signals.
    """
    h, l = df["high"], df["low"]
    win = 2 * k + 1
    is_hi = h == h.rolling(win, center=True).max()
    is_lo = l == l.rolling(win, center=True).min()
    sh = h.where(is_hi).shift(k)
    sl = l.where(is_lo).shift(k)
    return sh, sl
