"""Data loading: Yahoo Finance, MetaTrader 5, CSV or synthetic demo data.

All loaders return ``(hourly, daily)`` OHLCV DataFrames with lowercase
columns open/high/low/close/volume and a DatetimeIndex (hourly may be None).
"""
import numpy as np
import pandas as pd

OHLCV = ["open", "high", "low", "close", "volume"]

# Yahoo tickers used for inter-market analysis of gold
INTERMARKET_TICKERS = {"dxy": "DX-Y.NYB", "us10y": "^TNX", "silver": "SI=F"}


def _clean(df):
    if df is None or len(df) == 0:
        return None
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df.columns = [str(c).lower().replace("adj close", "adj_close") for c in df.columns]
    if "volume" not in df:
        df["volume"] = 0.0
    df = df[OHLCV].astype(float).dropna(subset=["open", "high", "low", "close"])
    idx = pd.to_datetime(df.index)
    if idx.tz is not None:
        idx = idx.tz_convert("UTC").tz_localize(None)
    df.index = idx
    return df[~df.index.duplicated(keep="last")].sort_index()


def resample(df, rule):
    # weekly bars are stamped with their (Friday) close date, intraday/daily bars with their open time
    side = "right" if rule.startswith("W") else "left"
    out = df.resample(rule, label=side, closed=side).agg(
        {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
    return out.dropna(subset=["close"])


# ---------------------------------------------------------------- yahoo
def _yahoo_chart(symbol, rng, interval, timeout=30):
    """Download bars straight from Yahoo's chart API with urllib.

    Needs no yfinance/curl_cffi, so it also runs on Termux (Android)."""
    import json
    import urllib.parse
    import urllib.request

    params = {"interval": interval, "includePrePost": "false"}
    if rng == "max":
        params["range"] = "max"
    else:  # intraday history is capped at ~730 days -> ask with explicit timestamps
        now = int(pd.Timestamp.now(tz="UTC").timestamp())
        params.update(period1=now - int(rng) * 86400, period2=now)
    q = urllib.parse.urlencode(params)
    last_err = None
    for host in ("query1", "query2"):
        url = f"https://{host}.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?{q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                payload = json.load(r)
            res = payload["chart"]["result"][0]
            quote = res["indicators"]["quote"][0]
            df = pd.DataFrame({k: quote.get(k) for k in OHLCV},
                              index=pd.to_datetime(res["timestamp"], unit="s"))
            return _clean(df)
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Yahoo download failed for {symbol!r}: {last_err}")


def _yahoo(symbol, rng, interval):
    """``rng`` is "max" or a number of days."""
    try:
        return _yahoo_chart(symbol, rng, interval)
    except Exception as err:
        try:  # fall back to yfinance when it is installed
            import yfinance as yf
        except ImportError:
            raise err
        period = "max" if rng == "max" else f"{rng}d"
        return _clean(yf.download(symbol, period=period, interval=interval, auto_adjust=False, progress=False))


def load_yahoo(symbol):
    daily = _yahoo(symbol, "max", "1d")
    try:
        hourly = _yahoo(symbol, "729", "1h")
    except Exception:
        hourly = None  # daily/weekly analysis still works
    if daily is None:
        raise RuntimeError(f"No data from Yahoo for {symbol!r} (check the ticker / internet / VPN).")
    return hourly, daily


def load_intermarket_yahoo():
    out = {}
    for key, tk in INTERMARKET_TICKERS.items():
        try:
            d = _yahoo(tk, "max", "1d")
            if d is not None:
                out[key] = d
        except Exception:  # an optional extra; never fatal
            pass
    return out


# ---------------------------------------------------------------- metatrader 5
def load_mt5(symbol="XAUUSD", h1_bars=15000, d1_bars=6000):
    import MetaTrader5 as mt5  # Windows only: pip install MetaTrader5

    if not mt5.initialize():
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")
    try:
        def get(tf, n):
            r = mt5.copy_rates_from_pos(symbol, tf, 0, n)
            if r is None:
                return None
            d = pd.DataFrame(r)
            d.index = pd.to_datetime(d["time"], unit="s")
            d = d.rename(columns={"tick_volume": "volume"})
            return _clean(d)

        return get(mt5.TIMEFRAME_H1, h1_bars), get(mt5.TIMEFRAME_D1, d1_bars)
    finally:
        mt5.shutdown()


# ---------------------------------------------------------------- csv
def load_csv(path):
    """CSV with a date/time column + open/high/low/close[/volume] (any case).

    Hourly (or finer) data is used for 1h/4h and resampled to daily;
    daily data gives 1d/1w only.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip().lower().strip("<>") for c in df.columns]
    if "date" in df and "time" in df:
        df.index = pd.to_datetime(df["date"].astype(str) + " " + df["time"].astype(str))
    else:
        tcol = next(c for c in df.columns if c in ("datetime", "date", "time", "timestamp", "gmt time"))
        df.index = pd.to_datetime(df[tcol])
    for alt, std in (("tickvol", "volume"), ("tick_volume", "volume"), ("vol", "volume")):
        if alt in df and "volume" not in df:
            df["volume"] = df[alt]
    df = _clean(df)
    step = df.index.to_series().diff().median()
    if step < pd.Timedelta(hours=1):
        df = resample(df, "1h")
        step = pd.Timedelta(hours=1)
    if step <= pd.Timedelta(hours=1):
        return df, resample(df, "1D")
    return None, df


# ---------------------------------------------------------------- demo
def synthetic(seed=7, years=8):
    """Regime-switching random walk that looks roughly like gold (for offline testing)."""
    rng = np.random.default_rng(seed)
    n = years * 252 * 23
    idx = pd.date_range("2018-01-01", periods=n, freq="h")
    drift = np.repeat(rng.normal(0, 0.00012, n // 400 + 1), 400)[:n]
    vol = 0.0018 * np.exp(np.repeat(rng.normal(0, 0.35, n // 600 + 1), 600)[:n])
    ret = drift + vol * rng.standard_t(5, n) / 1.3
    close = 1300 * np.exp(np.cumsum(ret))
    op = np.r_[close[0], close[:-1]]
    wick = np.abs(rng.normal(0, vol * close * 0.6, (2, n)))
    hourly = pd.DataFrame({"open": op, "high": np.maximum(op, close) + wick[0],
                           "low": np.minimum(op, close) - wick[1], "close": close,
                           "volume": rng.integers(500, 5000, n) * (1 + 40 * np.abs(ret))}, index=idx)
    hourly = hourly[hourly.index.dayofweek < 5]
    daily = resample(hourly, "1D")
    dxy_close = 95 * np.exp(-0.4 * np.log(daily["close"] / daily["close"].iloc[0]) + np.cumsum(rng.normal(0, 0.003, len(daily))))
    dxy = pd.DataFrame({"open": dxy_close, "high": dxy_close * 1.002, "low": dxy_close * 0.998,
                        "close": dxy_close, "volume": 0.0}, index=daily.index)
    return hourly, daily, {"dxy": dxy}


def build_timeframes(hourly, daily, intraday_bars=3000):
    """Medium-term stack: 1h (timing), 4h, daily, weekly."""
    tfs = {}
    if hourly is not None and len(hourly) > 300:
        tfs["1h"] = hourly.tail(intraday_bars)
        tfs["4h"] = resample(hourly, "4h").tail(intraday_bars)
    tfs["1d"] = daily
    tfs["1w"] = resample(daily, "W-FRI")
    return tfs
