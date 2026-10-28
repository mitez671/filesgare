"""CLI:  python -m gold_analyzer --symbol GC=F

Sources:
  --source yahoo   (default) Yahoo Finance ticker, e.g. GC=F (gold), SI=F, BTC-USD, EURUSD=X
  --source mt5     MetaTrader 5 terminal symbol, e.g. XAUUSD (Windows + MetaTrader5 package)
  --source csv     --csv file.csv  (hourly or daily OHLCV export)
  --source demo    synthetic data, for testing without internet

Graphical modes:
  --web            start the dashboard server (open http://localhost:8000, also on Termux)
  --html FILE      write one self-contained HTML report with charts
"""
import argparse
import json
import warnings

from . import report, service


def main():
    ap = argparse.ArgumentParser(description="تحلیل جامع چند تایم‌فریمی + یادگیری ماشین")
    ap.add_argument("--symbol", default="GC=F")
    ap.add_argument("--source", choices=["yahoo", "mt5", "csv", "demo"], default="yahoo")
    ap.add_argument("--csv")
    ap.add_argument("--horizon", type=int, default=10, help="ML horizon in daily bars (default 10 ≈ 2 weeks)")
    ap.add_argument("--no-ml", action="store_true")
    ap.add_argument("--no-intermarket", action="store_true", help="skip DXY / US10Y / silver")
    ap.add_argument("--json", help="also save the full result to this JSON file")
    ap.add_argument("--html", help="write a graphical HTML report to this file")
    ap.add_argument("--web", action="store_true", help="run the graphical dashboard server")
    ap.add_argument("--port", type=int, help="dashboard port (default $PORT or 8000)")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--open", action="store_true", help="open the dashboard in the browser")
    args = ap.parse_args()
    warnings.filterwarnings("ignore")

    if args.web:
        from . import web
        return web.serve(args.host, args.port, args.open)

    r = service.run(args.symbol, args.source, args.csv, args.horizon,
                    use_ml=not args.no_ml, use_intermarket=not args.no_intermarket)
    report.print_report(r["symbol"], r["res"], r["decision"], r["ml"], r["hit"])

    if args.json or args.html:
        payload = service.to_payload(r)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"نتیجه کامل در {args.json} ذخیره شد.")
    if args.html:
        from . import web
        with open(args.html, "w", encoding="utf-8") as f:
            f.write(web.render_html(payload))
        print(f"گزارش گرافیکی در {args.html} ذخیره شد (با مرورگر باز کنید).")


if __name__ == "__main__":
    main()
