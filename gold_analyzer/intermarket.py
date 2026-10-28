"""Inter-market analyzers (daily / weekly only), with one profile per instrument.

  gold / silver : weak dollar and falling yields are bullish; the sister metal confirms
  copper        : weak dollar, rising stocks and Chinese demand are bullish
  oil (WTI/Brent): weak dollar, rising stocks and copper (economic growth) are bullish;
                  the other oil benchmark confirms
"""
import re

import pandas as pd

from . import indicators as ind

BUY, SELL = 1, -1


def _align(other, df):
    return other["close"].reindex(df.index, method="ffill")


def _trend(s):
    """+1 when a market is above its EMA50 and up over 20 bars, -1 for the opposite."""
    e = ind.ema(s, 50)
    chg = s.pct_change(20, fill_method=None) * 100
    t = pd.Series(0.0, index=s.index)
    t[(s > e) & (chg > 0)] = 1
    t[(s < e) & (chg < 0)] = -1
    return t, e, chg


def inverse(label):
    """The target tends to move against this market (e.g. commodities vs the dollar)."""
    def fn(df, other):
        s = _align(other, df)
        t, _, chg = _trend(s)
        return -t, f"{label}={s.iloc[-1]:.2f}, 20-bar change {chg.iloc[-1]:+.2f}%"
    return fn


def positive(label):
    """The target tends to follow this market (e.g. copper follows stocks)."""
    def fn(df, other):
        s = _align(other, df)
        t, _, chg = _trend(s)
        return t, f"{label}={s.iloc[-1]:.2f}, 20-bar change {chg.iloc[-1]:+.2f}%"
    return fn


def confirm(label):
    """A sister market (silver for gold, Brent for WTI) confirms the target's own trend."""
    def fn(df, other):
        s = _align(other, df)
        e = ind.ema(s, 50)
        own_up = df["close"] > ind.ema(df["close"], 50)
        v = pd.Series(0.0, index=df.index)
        v[(s > e) & own_up] = BUY
        v[(s < e) & ~own_up] = SELL
        return v, f"{label}={s.iloc[-1]:.2f} vs EMA50={e.iloc[-1]:.2f}"
    return fn


def us10y_yield(df, other):
    y = _align(other, df)
    chg = y - y.shift(20)
    v = pd.Series(0.0, index=df.index)
    v[chg < -0.10] = BUY   # falling yields -> precious metals up
    v[chg > 0.10] = SELL
    return v, f"US10Y={y.iloc[-1]:.2f}%, 20-bar change {chg.iloc[-1]:+.2f}"


# (source key, Yahoo ticker, analyzer key, Persian name, function)
DXY = ("dxy", "DX-Y.NYB", "im_dxy", "شاخص دلار (DXY)", inverse("DXY"))
US10Y = ("us10y", "^TNX", "im_us10y", "بازده اوراق ۱۰ ساله آمریکا", us10y_yield)
SP500 = ("sp500", "^GSPC", "im_sp500", "بازار سهام آمریکا (S&P 500)", positive("S&P500"))

PROFILES = {
    "gold": [DXY, US10Y, ("silver", "SI=F", "im_silver", "تأیید نقره", confirm("Silver"))],
    "silver": [DXY, US10Y, ("gold", "GC=F", "im_gold", "تأیید طلا", confirm("Gold"))],
    "copper": [DXY, SP500, ("china", "FXI", "im_china", "سهام چین (FXI)", positive("FXI"))],
    "oil_wti": [DXY, SP500, ("copper", "HG=F", "im_copper", "مس (رشد اقتصادی)", positive("Copper")),
                ("brent", "BZ=F", "im_brent", "تأیید نفت برنت", confirm("Brent"))],
    "oil_brent": [DXY, SP500, ("copper", "HG=F", "im_copper", "مس (رشد اقتصادی)", positive("Copper")),
                  ("wti", "CL=F", "im_wti", "تأیید نفت WTI", confirm("WTI"))],
}

# Yahoo tickers and common MetaTrader symbol names (broker suffixes like ".m" are ignored)
ALIASES = {
    "gold": ["GC=F", "MGC=F", "XAUUSD", "GOLD"],
    "silver": ["SI=F", "SIL=F", "XAGUSD", "SILVER"],
    "copper": ["HG=F", "XCUUSD", "COPPER", "HG"],
    "oil_wti": ["CL=F", "MCL=F", "USOIL", "XTIUSD", "WTI", "CRUDE", "CL"],
    "oil_brent": ["BZ=F", "UKOIL", "XBRUSD", "BRENT"],
}
NAMES = {"gold": "طلا", "silver": "نقره", "copper": "مس", "oil_wti": "نفت WTI", "oil_brent": "نفت برنت"}


def profile_for(symbol):
    """Profile name for a ticker / MT5 symbol, or None (no inter-market analysis)."""
    s = (symbol or "").upper().strip()
    base = re.split(r"[._\-#]", s)[0] if "=" not in s else s
    for name, aliases in ALIASES.items():
        if s in aliases or base in aliases:
            return name
    return None
