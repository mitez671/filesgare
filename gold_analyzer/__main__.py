"""CLI:  python -m gold_analyzer --symbol GC=F

Sources:
  --source yahoo   (default) Yahoo Finance ticker, e.g. GC=F (gold), SI=F, BTC-USD, EURUSD=X
  --source mt5     MetaTrader 5 terminal symbol, e.g. XAUUSD (Windows + MetaTrader5 package)
  --source csv     --csv file.csv  (hourly or daily OHLCV export)
  --source demo    synthetic data, for testing without internet
"""
import argparse
import json
import warnings

import numpy as np

from . import data, engine, ml_model, report


def main():
    ap = argparse.ArgumentParser(description="تحلیل جامع چند تایم‌فریمی + یادگیری ماشین")
    ap.add_argument("--symbol", default="GC=F")
    ap.add_argument("--source", choices=["yahoo", "mt5", "csv", "demo"], default="yahoo")
    ap.add_argument("--csv")
    ap.add_argument("--horizon", type=int, default=10, help="ML horizon in daily bars (default 10 ≈ 2 weeks)")
    ap.add_argument("--no-ml", action="store_true")
    ap.add_argument("--no-intermarket", action="store_true", help="skip DXY / US10Y / silver")
    ap.add_argument("--json", help="also save the full result to this JSON file")
    args = ap.parse_args()
    warnings.filterwarnings("ignore")

    intermarket = {}
    print("در حال دریافت داده...")
    if args.source == "demo":
        hourly, daily, intermarket = data.synthetic()
        args.symbol = "DEMO (synthetic)"
    elif args.source == "csv":
        hourly, daily = data.load_csv(args.csv)
    elif args.source == "mt5":
        hourly, daily = data.load_mt5(args.symbol)
    else:
        hourly, daily = data.load_yahoo(args.symbol)
    if args.source != "demo" and not args.no_intermarket:
        try:
            intermarket = data.load_intermarket_yahoo()
        except Exception as e:
            print(f"(داده بین‌بازاری دریافت نشد: {e})")
    if args.no_intermarket:
        intermarket = {}

    tfs = data.build_timeframes(hourly, daily)
    print("در حال اجرای اندیکاتورها و تحلیل‌ها روی تایم‌فریم‌های " + ", ".join(tfs) + " ...")
    res = engine.analyze(tfs, intermarket)

    d_votes, _ = res["votes_history"]["1d"]
    hit = engine.analyzer_hit_rates(tfs["1d"], d_votes, args.horizon)

    ml, w_ml = None, 0.0
    if not args.no_ml:
        print("در حال آموزش مدل یادگیری ماشین (walk-forward)...")
        try:
            w_votes, _ = res["votes_history"]["1w"]
            X, y, fwd = ml_model.build_dataset(tfs["1d"], d_votes, tfs["1w"], w_votes,
                                               intermarket, horizon=args.horizon)
            ml = ml_model.train_and_predict(X, y, fwd, horizon=args.horizon)
            w_ml = ml_model.ml_weight(ml)
        except Exception as e:
            print(f"(ML اجرا نشد: {e})")

    decision = report.decide(res, ml, w_ml)
    report.print_report(args.symbol, res, decision, ml, hit)

    if args.json:
        out = {"symbol": args.symbol, "decision": decision, "ml": ml,
               "vote_score": res["vote_score"], "counts": res["counts"],
               "timeframes": {tf: {k: v for k, v in r.items()} for tf, r in res["timeframes"].items()}}
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2,
                      default=lambda o: None if isinstance(o, float) and np.isnan(o) else str(o))
        print(f"نتیجه کامل در {args.json} ذخیره شد.")


if __name__ == "__main__":
    main()
