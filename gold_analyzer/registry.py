"""List of every analyzer with its Persian name and category."""
from . import analyzers as a
from . import patterns as p
from . import smc as s

CATEGORIES = {
    "trend": ("روند", 1.0),
    "momentum": ("مومنتوم / اسیلاتور", 0.8),
    "volatility": ("نوسان", 0.6),
    "volume": ("حجم", 0.6),
    "charts": ("چارت‌های جایگزین", 0.6),
    "price_action": ("پرایس اکشن / الگوها", 1.0),
    "smc": ("پول هوشمند (SMC)", 1.0),
    "intermarket": ("بین‌بازاری", 0.8),
}

# key: (persian name, category, function)
ANALYZERS = {
    # trend
    "ema_cross": ("کراس EMA 20/50", "trend", a.ema_cross),
    "golden_cross": ("گلدن/دث کراس 50/200", "trend", a.golden_cross),
    "ema200": ("قیمت نسبت به EMA200", "trend", a.price_vs_ema200),
    "macd": ("MACD", "trend", a.macd_signal),
    "adx": ("ADX / DMI", "trend", a.adx_dmi),
    "ichimoku": ("ابر ایچیموکو", "trend", a.ichimoku_cloud),
    "psar": ("Parabolic SAR", "trend", a.parabolic_sar),
    "supertrend": ("سوپرترند", "trend", a.supertrend),
    "hull": ("Hull MA", "trend", a.hull_ma),
    "aroon": ("آرون", "trend", a.aroon),
    "trix": ("TRIX", "trend", a.trix),
    "linreg": ("شیب رگرسیون خطی", "trend", a.linreg_trend),
    "donchian": ("شکست کانال دونچیان", "trend", a.donchian_breakout),
    # momentum
    "rsi": ("RSI", "momentum", a.rsi_zone),
    "rsi_div": ("واگرایی RSI", "momentum", a.rsi_divergence),
    "stoch": ("استوکاستیک", "momentum", a.stochastic),
    "stoch_rsi": ("Stoch RSI", "momentum", a.stoch_rsi),
    "cci": ("CCI", "momentum", a.cci),
    "williams": ("Williams %R", "momentum", a.williams_r),
    "roc": ("مومنتوم ROC", "momentum", a.momentum_roc),
    "ao": ("Awesome Oscillator", "momentum", a.awesome_osc),
    # volatility
    "bollinger": ("باند بولینگر", "volatility", a.bollinger_bands),
    "squeeze": ("اسکوئیز بولینگر/کلتنر", "volatility", a.squeeze_breakout),
    "zscore": ("بازگشت به میانگین (Z-Score)", "volatility", a.zscore_reversion),
    # volume
    "obv": ("OBV", "volume", a.obv_trend),
    "mfi": ("MFI", "volume", a.mfi),
    "cmf": ("Chaikin Money Flow", "volume", a.cmf),
    "vwap": ("VWAP", "volume", a.vwap),
    "vprofile": ("پروفایل حجمی (Value Area)", "volume", p.volume_profile),
    # chart types
    "heikin": ("چارت هیکن آشی", "charts", a.heikin_ashi),
    "renko": ("چارت رنکو", "charts", a.renko),
    # price action
    "candles": ("الگوهای کندل استیک", "price_action", p.candlestick_patterns),
    "dow": ("ساختار سقف/کف (داو)", "price_action", p.higher_highs_lows),
    "double": ("سقف/کف دوقلو", "price_action", p.double_top_bottom),
    "sr": ("حمایت و مقاومت", "price_action", p.support_resistance),
    "fib": ("فیبوناچی اصلاحی", "price_action", p.fibonacci_retracement),
    "pivot": ("پیوت پوینت کلاسیک", "price_action", p.pivot_points),
    # smart money
    "structure": ("ساختار بازار BOS/CHoCH", "smc", s.market_structure),
    "order_block": ("اوردر بلاک", "smc", s.order_blocks),
    "fvg": ("FVG / ایمبالانس", "smc", s.fair_value_gaps),
    "liquidity": ("شکار نقدینگی (Sweep)", "smc", s.liquidity_sweep),
    "pd_zone": ("پریمیوم / دیسکانت", "smc", s.premium_discount),
}
