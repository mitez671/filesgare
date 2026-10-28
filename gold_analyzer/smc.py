"""Smart Money Concepts (SMC / ICT) analyzers.

Market structure (BOS / CHoCH), order blocks, fair value gaps,
liquidity sweeps and premium/discount zones. Same ``(votes, note)``
contract as ``analyzers.py``; all loops only look at past bars.
"""
import numpy as np
import pandas as pd

from . import indicators as ind

BUY, SELL, WAIT = 1, -1, 0


def _structure(df, k=3):
    """Walk the bars and track swing-based market structure.

    Returns a DataFrame with per-bar columns:
      trend        +1 / -1 / 0 after the last break of structure
      event        'BOS↑' 'BOS↓' 'CHoCH↑' 'CHoCH↓' on the break bar, else ''
      swing_hi/lo  last confirmed swing high / low prices
      break_idx    bar position of the last structure break
    """
    sh, sl = (x.values for x in ind.swing_points(df, k))
    close = df["close"].values
    n = len(df)
    trend = np.zeros(n)
    event = [""] * n
    last_hi = np.full(n, np.nan)
    last_lo = np.full(n, np.nan)
    brk = np.full(n, -1)
    hi = lo = np.nan
    hi_used = lo_used = True
    t, b = 0, -1
    for i in range(n):
        if not np.isnan(sh[i]):
            hi, hi_used = sh[i], False
        if not np.isnan(sl[i]):
            lo, lo_used = sl[i], False
        if not hi_used and close[i] > hi:
            event[i] = "BOS↑" if t == 1 else "CHoCH↑"
            t, hi_used, b = 1, True, i
        elif not lo_used and close[i] < lo:
            event[i] = "BOS↓" if t == -1 else "CHoCH↓"
            t, lo_used, b = -1, True, i
        trend[i], last_hi[i], last_lo[i], brk[i] = t, hi, lo, b
    return pd.DataFrame({"trend": trend, "event": event, "swing_hi": last_hi,
                         "swing_lo": last_lo, "break_idx": brk}, index=df.index)


def market_structure(df):
    s = _structure(df)
    ev = s["event"][s["event"] != ""]
    last = f"{ev.iloc[-1]} @ {ev.index[-1]}" if len(ev) else "no break yet"
    return s["trend"].astype(float), f"last event: {last}"


def order_blocks(df, max_age=60):
    """Price returning into the last unmitigated order block, in trend direction."""
    s = _structure(df)
    o, h, l, c = (df[x].values for x in ("open", "high", "low", "close"))
    a = ind.atr(df).values
    n = len(df)
    votes = np.zeros(n)
    bull_ob = bear_ob = None  # (low, high, created_at)
    events = s["event"].values
    for i in range(n):
        ev = events[i]
        if ev:
            if ev.endswith("↑"):
                for j in range(i - 1, max(i - 15, 0), -1):  # last bearish candle before the impulse
                    if c[j] < o[j]:
                        bull_ob = (l[j], h[j], i)
                        break
            elif ev.endswith("↓"):
                for j in range(i - 1, max(i - 15, 0), -1):
                    if c[j] > o[j]:
                        bear_ob = (l[j], h[j], i)
                        break
        if bull_ob and (c[i] < bull_ob[0] or i - bull_ob[2] > max_age):
            bull_ob = None  # mitigated / broken / too old
        if bear_ob and (c[i] > bear_ob[1] or i - bear_ob[2] > max_age):
            bear_ob = None
        tol = 0.3 * a[i] if not np.isnan(a[i]) else 0
        if bull_ob and i > bull_ob[2] and l[i] <= bull_ob[1] + tol and c[i] >= bull_ob[0]:
            votes[i] = BUY
        elif bear_ob and i > bear_ob[2] and h[i] >= bear_ob[0] - tol and c[i] <= bear_ob[1]:
            votes[i] = SELL
    note = []
    if bull_ob:
        note.append(f"bullish OB {bull_ob[0]:.2f}-{bull_ob[1]:.2f}")
    if bear_ob:
        note.append(f"bearish OB {bear_ob[0]:.2f}-{bear_ob[1]:.2f}")
    return pd.Series(votes, index=df.index), ", ".join(note) or "no active OB"


def fair_value_gaps(df, max_age=40):
    """Retracement into an unfilled FVG (imbalance) = continuation entry."""
    h, l, c = df["high"].values, df["low"].values, df["close"].values
    n = len(df)
    votes = np.zeros(n)
    gaps = []  # [bottom, top, dir, created]
    for i in range(2, n):
        if l[i] > h[i - 2]:
            gaps.append([h[i - 2], l[i], BUY, i])
        elif h[i] < l[i - 2]:
            gaps.append([h[i], l[i - 2], SELL, i])
        alive = []
        for g in gaps:
            bottom, top, d, t0 = g
            if i - t0 > max_age:
                continue
            if (d == BUY and c[i] < bottom) or (d == SELL and c[i] > top):
                continue  # fully filled / invalidated
            alive.append(g)
            if i > t0 and l[i] <= top and h[i] >= bottom and votes[i] == 0:
                votes[i] = d
        gaps = alive
    bull = sum(1 for g in gaps if g[2] == BUY)
    bear = len(gaps) - bull
    return pd.Series(votes, index=df.index), f"open FVGs: {bull} bullish / {bear} bearish"


def liquidity_sweep(df, hold=4):
    """Stop hunt: wick through a swing level then close back inside."""
    s = _structure(df)
    h, l, c = df["high"].values, df["low"].values, df["close"].values
    hi, lo = s["swing_hi"].shift().values, s["swing_lo"].shift().values
    sig = np.zeros(len(df))
    for i in range(len(df)):
        if not np.isnan(lo[i]) and l[i] < lo[i] and c[i] > lo[i]:
            sig[i] = BUY  # sell-side liquidity taken
        elif not np.isnan(hi[i]) and h[i] > hi[i] and c[i] < hi[i]:
            sig[i] = SELL  # buy-side liquidity taken
    v = pd.Series(sig, index=df.index).replace(0, np.nan).ffill(limit=hold - 1).fillna(0)
    last = {1: "sell-side liquidity swept (bullish)", -1: "buy-side liquidity swept (bearish)"}
    return v, last.get(int(v.iloc[-1]), "no recent sweep")


def premium_discount(df, look=60):
    """Buy in discount of the dealing range in an uptrend, sell in premium in a downtrend."""
    s = _structure(df)
    hi = df["high"].rolling(look).max()
    lo = df["low"].rolling(look).min()
    pos = (df["close"] - lo) / (hi - lo).replace(0, np.nan)
    v = pd.Series(0.0, index=df.index)
    v[(pos < 0.5) & (s["trend"] > 0)] = BUY
    v[(pos > 0.5) & (s["trend"] < 0)] = SELL
    p = pos.iloc[-1]
    zone = "discount" if p < 0.5 else "premium"
    return v, f"{zone} ({p*100:.0f}% of {look}-bar range)" if not np.isnan(p) else "n/a"
