"""Classic technical analyzers.

Each analyzer receives an OHLCV DataFrame and returns ``(votes, note)``:
  * votes – Series aligned to df: +1 = BUY, -1 = SELL, 0 = WAIT, for every bar
    (only past data is used at each bar, so the series doubles as an ML feature)
  * note  – short human-readable explanation of the latest bar
"""
import numpy as np
import pandas as pd

from . import indicators as ind

BUY, SELL, WAIT = 1, -1, 0


def _v(cond_buy, cond_sell, index):
    v = pd.Series(WAIT, index=index, dtype=float)
    v[cond_buy.fillna(False).astype(bool)] = BUY
    v[cond_sell.fillna(False).astype(bool)] = SELL
    return v


def _hold(signal, bars):
    """Keep a one-bar event signal alive for ``bars`` bars."""
    return signal.replace(0, np.nan).ffill(limit=bars - 1).fillna(0)


def _f(x, d=2):
    return "nan" if pd.isna(x) else f"{x:.{d}f}"


# ================================================================ TREND
def ema_cross(df):
    f, s = ind.ema(df.close, 20), ind.ema(df.close, 50)
    return _v(f > s, f < s, df.index), f"EMA20={_f(f.iloc[-1])} EMA50={_f(s.iloc[-1])}"


def golden_cross(df):
    f, s = ind.sma(df.close, 50), ind.sma(df.close, 200)
    return _v(f > s, f < s, df.index), f"SMA50={_f(f.iloc[-1])} SMA200={_f(s.iloc[-1])}"


def price_vs_ema200(df):
    e = ind.ema(df.close, 200)
    a = ind.atr(df)
    v = _v(df.close > e + 0.25 * a, df.close < e - 0.25 * a, df.index)
    return v, f"Close={_f(df.close.iloc[-1])} EMA200={_f(e.iloc[-1])}"


def macd_signal(df):
    m, s, h = ind.macd(df.close)
    v = _v((m > s) & (h > h.shift()), (m < s) & (h < h.shift()), df.index)
    return v, f"MACD={_f(m.iloc[-1])} Signal={_f(s.iloc[-1])} Hist={_f(h.iloc[-1])}"


def adx_dmi(df):
    a, p, m = ind.adx(df)
    v = _v((a > 20) & (p > m), (a > 20) & (m > p), df.index)
    return v, f"ADX={_f(a.iloc[-1],1)} +DI={_f(p.iloc[-1],1)} -DI={_f(m.iloc[-1],1)}"


def ichimoku_cloud(df):
    t, k, sa, sb = ind.ichimoku(df)
    top, bot = np.maximum(sa, sb), np.minimum(sa, sb)
    c = df.close
    chikou_up = c > c.shift(26)
    v = _v((c > top) & (t > k) & chikou_up, (c < bot) & (t < k) & ~chikou_up, df.index)
    pos = "above cloud" if c.iloc[-1] > top.iloc[-1] else "below cloud" if c.iloc[-1] < bot.iloc[-1] else "inside cloud"
    return v, f"{pos}, Tenkan={_f(t.iloc[-1])} Kijun={_f(k.iloc[-1])}"


def parabolic_sar(df):
    sar, tr = ind.psar(df)
    return tr.astype(float), f"SAR={_f(sar.iloc[-1])}"


def supertrend(df):
    tr = ind.supertrend(df)
    return tr.astype(float), "trend up" if tr.iloc[-1] > 0 else "trend down"


def hull_ma(df):
    h = ind.hma(df.close, 21)
    return _v(h > h.shift(2), h < h.shift(2), df.index), f"HMA21={_f(h.iloc[-1])}"


def aroon(df):
    up, dn = ind.aroon(df)
    return _v((up > 70) & (up > dn), (dn > 70) & (dn > up), df.index), f"Up={_f(up.iloc[-1],0)} Down={_f(dn.iloc[-1],0)}"


def trix(df):
    t = ind.trix(df.close)
    sig = ind.ema(t, 9)
    return _v((t > sig) & (t > 0), (t < sig) & (t < 0), df.index), f"TRIX={_f(t.iloc[-1],4)}"


def linreg_trend(df):
    s = ind.linreg_slope(df.close, 50)
    return _v(s > 0.03, s < -0.03, df.index), f"slope={_f(s.iloc[-1],3)}%/bar"


def donchian_breakout(df):
    hi, lo = ind.donchian(df, 20)
    brk = _v(df.close >= hi.shift(), df.close <= lo.shift(), df.index)
    return _hold(brk, 5), f"20-bar high={_f(hi.iloc[-1])} low={_f(lo.iloc[-1])}"


# ================================================================ MOMENTUM
def rsi_zone(df):
    r = ind.rsi(df.close)
    buy = (r < 30) | ((r > 50) & (r < 70) & (r > r.shift(3)))
    sell = (r > 70) | ((r < 50) & (r > 30) & (r < r.shift(3)))
    return _v(buy, sell, df.index), f"RSI14={_f(r.iloc[-1],1)}"


def rsi_divergence(df, look=30):
    r = ind.rsi(df.close)
    sh, sl = ind.swing_points(df, 3)
    rsi_at = r.shift(3)  # RSI at the swing bar (confirmed 3 bars later)
    sig = pd.Series(0.0, index=df.index)
    last_lo = last_hi = None
    for i, t in enumerate(df.index):
        if not np.isnan(sl.iloc[i]):
            cur = (i, sl.iloc[i], rsi_at.iloc[i])
            if last_lo and i - last_lo[0] < look and cur[1] < last_lo[1] and cur[2] > last_lo[2]:
                sig.iloc[i] = BUY  # bullish divergence
            last_lo = cur
        if not np.isnan(sh.iloc[i]):
            cur = (i, sh.iloc[i], rsi_at.iloc[i])
            if last_hi and i - last_hi[0] < look and cur[1] > last_hi[1] and cur[2] < last_hi[2]:
                sig.iloc[i] = SELL  # bearish divergence
            last_hi = cur
    v = _hold(sig, 8)
    return v, {1: "bullish divergence", -1: "bearish divergence"}.get(int(v.iloc[-1]), "no divergence")


def stochastic(df):
    k, d = ind.stochastic(df)
    buy = (k > d) & (k.shift() <= d.shift()) & (k < 30)
    sell = (k < d) & (k.shift() >= d.shift()) & (k > 70)
    v = _hold(_v(buy, sell, df.index), 4)
    v[(v == 0) & (k < 15)] = BUY
    v[(v == 0) & (k > 85)] = SELL
    return v, f"%K={_f(k.iloc[-1],1)} %D={_f(d.iloc[-1],1)}"


def stoch_rsi(df):
    k, d = ind.stoch_rsi(df.close)
    buy = (k > d) & (k < 25)
    sell = (k < d) & (k > 75)
    return _v(buy, sell, df.index), f"K={_f(k.iloc[-1],1)} D={_f(d.iloc[-1],1)}"


def cci(df):
    c = ind.cci(df)
    buy = (c < -100) & (c > c.shift())
    sell = (c > 100) & (c < c.shift())
    return _v(buy, sell, df.index), f"CCI20={_f(c.iloc[-1],0)}"


def williams_r(df):
    w = ind.williams_r(df)
    return _v((w < -80) & (w > w.shift()), (w > -20) & (w < w.shift()), df.index), f"%R={_f(w.iloc[-1],1)}"


def momentum_roc(df):
    r = ind.roc(df.close, 12)
    return _v(r > 1, r < -1, df.index), f"ROC12={_f(r.iloc[-1])}%"


def awesome_osc(df):
    a = ind.awesome_oscillator(df)
    return _v((a > 0) & (a > a.shift()), (a < 0) & (a < a.shift()), df.index), f"AO={_f(a.iloc[-1])}"


# ================================================================ VOLATILITY
def bollinger_bands(df):
    up, mid, lo = ind.bollinger(df.close)
    c = df.close
    buy = (c.shift() < lo.shift()) & (c > lo)  # re-entry from below band
    sell = (c.shift() > up.shift()) & (c < up)
    v = _hold(_v(buy, sell, df.index), 3)
    pb = (c - lo) / (up - lo)
    return v, f"%B={_f(pb.iloc[-1])} width={_f(((up-lo)/mid).iloc[-1]*100)}%"


def squeeze_breakout(df):
    bu, _, bl = ind.bollinger(df.close)
    ku, _, kl = ind.keltner(df)
    sq = (bu < ku) & (bl > kl)
    released = sq.shift().fillna(False).astype(bool) & ~sq
    mom = df.close - ind.sma(df.close, 20)
    v = _hold(_v(released & (mom > 0), released & (mom < 0), df.index), 6)
    return v, "squeeze ON" if sq.iloc[-1] else "no squeeze"


def zscore_reversion(df):
    m = ind.sma(df.close, 50)
    sd = df.close.rolling(50).std()
    z = (df.close - m) / sd
    return _v(z < -2, z > 2, df.index), f"z50={_f(z.iloc[-1])}"


# ================================================================ VOLUME
def _no_vol(df):
    return pd.Series(0.0, index=df.index), "no volume data"


def obv_trend(df):
    if not ind.has_volume(df):
        return _no_vol(df)
    o = ind.obv(df)
    e = ind.ema(o, 20)
    return _v(o > e, o < e, df.index), "OBV above EMA20" if o.iloc[-1] > e.iloc[-1] else "OBV below EMA20"


def mfi(df):
    if not ind.has_volume(df):
        return _no_vol(df)
    m = ind.mfi(df)
    return _v((m < 20) | ((m > 50) & (m < 80) & (m > m.shift(3))), (m > 80) | ((m < 50) & (m > 20) & (m < m.shift(3))), df.index), f"MFI={_f(m.iloc[-1],1)}"


def cmf(df):
    if not ind.has_volume(df):
        return _no_vol(df)
    c = ind.cmf(df)
    return _v(c > 0.05, c < -0.05, df.index), f"CMF={_f(c.iloc[-1],3)}"


def vwap(df):
    if not ind.has_volume(df):
        return _no_vol(df)
    w = ind.rolling_vwap(df, 20)
    return _v(df.close > w, df.close < w, df.index), f"VWAP20={_f(w.iloc[-1])}"


# ================================================================ ALTERNATIVE CHARTS
def heikin_ashi(df):
    ha = ind.heikin_ashi(df)
    green = ha.close > ha.open
    red = ha.close < ha.open
    strong_up = green & green.shift() & green.shift(2)
    strong_dn = red & red.shift() & red.shift(2)
    return _v(strong_up, strong_dn, df.index), "HA green" if green.iloc[-1] else "HA red"


def renko(df):
    d, run = ind.renko_direction(df)
    return _v((d > 0) & (run >= 2), (d < 0) & (run >= 2), df.index), f"last brick {'up' if d.iloc[-1]>0 else 'down'}, run={int(run.iloc[-1])}"
