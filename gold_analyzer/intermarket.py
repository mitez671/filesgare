"""Inter-market analyzers for gold (daily / weekly only).

Gold usually moves against the US dollar index and real yields,
and together with silver.
"""
import pandas as pd

from . import indicators as ind

BUY, SELL = 1, -1


def _align(other, df):
    return other["close"].reindex(df.index, method="ffill")


def dollar_index(df, other):
    d = _align(other, df)
    e = ind.ema(d, 50)
    chg = d.pct_change(20) * 100
    v = pd.Series(0.0, index=df.index)
    v[(d < e) & (chg < 0)] = BUY   # weak dollar -> gold up
    v[(d > e) & (chg > 0)] = SELL
    return v, f"DXY={d.iloc[-1]:.2f}, 20-bar change {chg.iloc[-1]:+.2f}%"


def us10y_yield(df, other):
    y = _align(other, df)
    chg = y - y.shift(20)
    v = pd.Series(0.0, index=df.index)
    v[chg < -0.10] = BUY   # falling yields -> gold up
    v[chg > 0.10] = SELL
    return v, f"US10Y={y.iloc[-1]:.2f}%, 20-bar change {chg.iloc[-1]:+.2f}"


def silver_confirmation(df, other):
    s = _align(other, df)
    e = ind.ema(s, 50)
    gold_up = df["close"] > ind.ema(df["close"], 50)
    v = pd.Series(0.0, index=df.index)
    v[(s > e) & gold_up] = BUY
    v[(s < e) & ~gold_up] = SELL
    return v, f"Silver={s.iloc[-1]:.2f} vs EMA50={e.iloc[-1]:.2f}"


INTERMARKET = {"dxy": ("dollar_index", "شاخص دلار (DXY)", dollar_index),
               "us10y": ("us10y_yield", "بازده اوراق ۱۰ ساله آمریکا", us10y_yield),
               "silver": ("silver_confirm", "تأیید نقره", silver_confirmation)}
