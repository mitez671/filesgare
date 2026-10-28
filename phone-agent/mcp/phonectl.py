#!/usr/bin/env python3
"""
phonectl.py - quick manual tester for the Phone Agent app (no Claude needed).

  export PHONE_TOKEN=<token from the app>
  python3 phonectl.py info
  python3 phonectl.py tree
  python3 phonectl.py shot out.jpg
  python3 phonectl.py tap 540 1200          # real screen pixels
  python3 phonectl.py type "سلام"
  python3 phonectl.py key home
  python3 phonectl.py open telegram
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phone_mcp as p  # noqa: E402


def main(argv):
    if not argv:
        print(__doc__)
        return
    cmd, a = argv[0], argv[1:]
    if cmd == "info":
        print(json.dumps(p._call("GET", "/info"), ensure_ascii=False, indent=2))
    elif cmd == "tree":
        print(p.t_ui_tree({})[0]["text"])
    elif cmd == "shot":
        out = a[0] if a else "screen.jpg"
        data = p._call("GET", "/screenshot", query={"scale": p.scale(), "q": 80}, raw=True)
        open(out, "wb").write(data)
        print(f"saved {out} ({len(data)//1024} KB)")
    elif cmd == "tap":
        print(p._call("POST", "/tap", {"x": float(a[0]), "y": float(a[1])}))
    elif cmd == "type":
        print(p._call("POST", "/type", {"text": " ".join(a)}))
    elif cmd == "key":
        print(p._call("POST", "/key", {"key": a[0]}))
    elif cmd == "open":
        print(p.t_open_app({"package": a[0]})[0]["text"])
    elif cmd == "apps":
        print(p.t_list_apps({"query": a[0] if a else ""})[0]["text"])
    else:
        print(__doc__)


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except p.PhoneError as e:
        print("Error:", e)
        sys.exit(1)
