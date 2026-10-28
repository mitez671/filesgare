"""Final decision + Persian console report."""
import numpy as np

from .engine import TF_NAMES
from .registry import CATEGORIES

VOTE_FA = {1: "🟢 خرید", -1: "🔴 فروش", 0: "⚪ صبر"}


def decide(res, ml=None, w_ml=0.0):
    vote = res["vote_score"]
    ml_score = (ml["p_buy"] - ml["p_sell"]) if ml else 0.0
    final = (1 - w_ml) * vote + w_ml * ml_score
    if final >= 0.35:
        sig, level = "STRONG BUY", 2
    elif final >= 0.15:
        sig, level = "BUY", 1
    elif final <= -0.35:
        sig, level = "STRONG SELL", -2
    elif final <= -0.15:
        sig, level = "SELL", -1
    else:
        sig, level = "WAIT", 0
    warnings = []
    tfs = res["timeframes"]
    # confluence filter: daily vs weekly disagreement downgrades the signal one step
    if "1d" in tfs and "1w" in tfs:
        d, w = tfs["1d"]["score"], tfs["1w"]["score"]
        if d * w < 0 and abs(d) > 0.1 and abs(w) > 0.1 and level != 0:
            level = int(np.sign(level)) * (abs(level) - 1)
            sig = {2: "STRONG BUY", 1: "BUY", 0: "WAIT", -1: "SELL", -2: "STRONG SELL"}[level]
            warnings.append("روند روزانه و هفتگی هم‌جهت نیستند → سیگنال یک درجه تضعیف شد")
    if ml and level != 0 and np.sign(ml_score) != np.sign(vote) and abs(ml_score) > 0.2:
        warnings.append("مدل ML با رأی‌گیری اندیکاتورها مخالف است → با حجم کمتر وارد شوید")

    base_tf = tfs.get("1d") or next(iter(tfs.values()))
    price, a = base_tf["close"], base_tf["atr"]
    plan = None
    if level != 0:
        d = 1 if level > 0 else -1
        plan = {"entry": price, "stop_loss": price - d * 1.5 * a,
                "tp1": price + d * 1.5 * a, "tp2": price + d * 3.0 * a, "tp3": price + d * 4.5 * a}
    return {"signal": sig, "level": level, "final_score": final, "vote_score": vote,
            "ml_score": ml_score, "ml_weight": w_ml, "warnings": warnings, "plan": plan,
            "confidence": min(abs(final) / 0.6, 1.0)}


def _bar(x, width=20):
    n = int(round((x + 1) / 2 * width))
    return "[" + "#" * n + "-" * (width - n) + "]"


def print_report(symbol, res, decision, ml=None, hit_rates=None):
    line = "=" * 78
    print(line)
    print(f" تحلیل جامع چند تایم‌فریمی  |  {symbol}  |  افق: میان‌مدت (۱ تا ۳ هفته)")
    print(line)
    for tf, r in res["timeframes"].items():
        c = r["counts"]
        print(f"\n■ تایم‌فریم {TF_NAMES.get(tf, tf)} ({tf})  وزن={r['weight']:.2f}  "
              f"قیمت={r['close']:.2f}  آخرین کندل={r['time']}")
        print(f"  امتیاز: {r['score']:+.2f} {_bar(r['score'])}   "
              f"خرید={c['buy']}  فروش={c['sell']}  صبر={c['wait']}")
        by_cat = {}
        for row in r["rows"]:
            by_cat.setdefault(row["category"], []).append(row)
        for cat, rows in by_cat.items():
            cs = r["categories"].get(cat, 0)
            print(f"   ── {CATEGORIES[cat][0]}  (میانگین {cs:+.2f})")
            for row in rows:
                hr = ""
                if hit_rates and tf == "1d" and row["key"] in hit_rates:
                    hr = f"  [دقت تاریخی {hit_rates[row['key']][0]*100:.0f}%]"
                print(f"      {VOTE_FA[row['vote']]:<8} {row['name']:<28} {row['note']}{hr}")

    c = res["counts"]
    tot = sum(c.values())
    print("\n" + line)
    print(" جمع‌بندی رأی‌ها (همه تایم‌فریم‌ها)")
    print(line)
    print(f"  {c['buy']} ابزار می‌گویند بخر  |  {c['sell']} ابزار می‌گویند بفروش  |  {c['wait']} ابزار می‌گویند صبر کن"
          f"   (از {tot})")
    for tf, r in res["timeframes"].items():
        print(f"  {TF_NAMES.get(tf, tf):<10} {r['score']:+.2f} {_bar(r['score'])}")
    print(f"  امتیاز وزنی رأی‌گیری: {res['vote_score']:+.3f}")

    if ml:
        print("\n" + line)
        print(" مدل یادگیری ماشین (RandomForest + GradientBoosting + Logistic، رأی نرم)")
        print(line)
        print(f"  احتمال‌ها برای ۱۰ روز آینده →  خرید {ml['p_buy']*100:.1f}%   "
              f"صبر {ml['p_wait']*100:.1f}%   فروش {ml['p_sell']*100:.1f}%")
        print(f"  اعتبارسنجی Walk-Forward روی {ml['n_samples']} روز ({ml['n_features']} ویژگی):")
        print(f"    دقت کل {ml['cv_accuracy']*100:.1f}%  (مبنای ساده {ml['baseline_accuracy']*100:.1f}%)")
        bp = "-" if np.isnan(ml["buy_precision"]) else f"{ml['buy_precision']*100:.1f}%"
        sp = "-" if np.isnan(ml["sell_precision"]) else f"{ml['sell_precision']*100:.1f}%"
        at = "-" if np.isnan(ml["avg_trade_pct"]) else f"{ml['avg_trade_pct']:+.2f}%"
        print(f"    درستی جهت سیگنال‌های خرید {bp} ({ml['n_buy_calls']})  "
              f"فروش {sp} ({ml['n_sell_calls']})  میانگین سود هر معامله {at}")
        print("  مهم‌ترین ویژگی‌ها: " + ", ".join(list(ml["top_features"])[:6]))
        print(f"  وزن ML در تصمیم نهایی: {decision['ml_weight']:.2f}")

    print("\n" + line)
    fa = {"STRONG BUY": "خرید قوی (LONG)", "BUY": "خرید (LONG)", "WAIT": "صبر / بدون معامله",
          "SELL": "فروش (SHORT)", "STRONG SELL": "فروش قوی (SHORT)"}
    print(f" ★ سیگنال نهایی: {decision['signal']}  —  {fa[decision['signal']]}")
    print(f"   امتیاز نهایی {decision['final_score']:+.3f}   اطمینان {decision['confidence']*100:.0f}%")
    for w in decision["warnings"]:
        print(f"   ⚠ {w}")
    p = decision["plan"]
    if p:
        print(f"   ورود ≈ {p['entry']:.2f}   حد ضرر {p['stop_loss']:.2f} (۱.۵ ATR روزانه)")
        print(f"   تارگت‌ها: TP1 {p['tp1']:.2f}   TP2 {p['tp2']:.2f}   TP3 {p['tp3']:.2f}")
    print(line)
    print(" این خروجی صرفاً تحلیل الگوریتمی است و توصیه سرمایه‌گذاری نیست؛ مدیریت سرمایه را رعایت کنید.")
