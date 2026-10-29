"""Tiny web server (standard library only) for the graphical dashboard.

    python -m gold_analyzer --web            # then open http://localhost:8000 on the phone
    python -m gold_analyzer --html out.html  # one self-contained HTML report file

Works on Termux: binds 0.0.0.0, so other devices on the same Wi-Fi can open
it too, and honours $PORT so it can be deployed to any Python host.
"""
import errno
import json
import os
import shutil
import socket
import subprocess
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from . import service

WEB_DIR = Path(__file__).with_name("web")
TEMPLATE = WEB_DIR / "index.html"
VENDOR_JS = "vendor/lightweight-charts.standalone.production.js"
CACHE_SECONDS = 300
_cache = {}
_lock = threading.Lock()


def render_html(payload=None):
    """The dashboard page; with a payload it becomes a standalone offline report
    (data and chart library inlined, no server or internet needed)."""
    html = TEMPLATE.read_text(encoding="utf-8")
    if payload is not None:
        lib = (WEB_DIR / VENDOR_JS).read_text(encoding="utf-8").replace("</script", "<\\/script")
        html = html.replace(f'<script src="{VENDOR_JS}"></script>', f"<script>{lib}</script>")
        blob = json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")
        html = html.replace('<script id="payload" type="application/json">null</script>',
                            f'<script id="payload" type="application/json">{blob}</script>')
    return html


def _params(qs):
    q = {k: v[-1] for k, v in parse_qs(qs).items()}
    return {
        "symbol": q.get("symbol", "GC=F").strip() or "GC=F",
        "source": q.get("source", "yahoo") if q.get("source") in ("yahoo", "demo", "mt5") else "yahoo",
        "horizon": max(3, min(int(q.get("horizon", 10) or 10), 40)),
        "use_ml": q.get("ml", "1") == "1",
        "use_intermarket": q.get("im", "1") == "1",
    }


def analyze_cached(p, force=False):
    key = json.dumps(p, sort_keys=True)
    with _lock:  # one heavy analysis at a time (phones have little RAM/CPU)
        hit = _cache.get(key)
        if hit and not force and time.time() - hit[0] < CACHE_SECONDS:
            return hit[1]
        payload = service.to_payload(service.run(**p, log=lambda m: print("  " + m)))
        _cache[key] = (time.time(), payload)
        return payload


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype, extra=None):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        extra = {"Cache-Control": "no-store", **(extra or {})}
        for k, v in extra.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        try:
            if u.path in ("/", "/index.html"):
                return self._send(200, render_html(), "text/html; charset=utf-8")
            if u.path == "/api/analyze":
                q = parse_qs(u.query)
                payload = analyze_cached(_params(u.query), force=q.get("refresh", ["0"])[-1] == "1")
                return self._send(200, json.dumps(payload, ensure_ascii=False), "application/json; charset=utf-8")
            if u.path == "/report.html":
                payload = analyze_cached(_params(u.query))
                name = "report-" + "".join(ch for ch in payload["symbol"] if ch.isalnum()) + ".html"
                return self._send(200, render_html(payload), "text/html; charset=utf-8",
                                  {"Content-Disposition": f'attachment; filename="{name}"'})
            if u.path.startswith("/vendor/"):
                f = (WEB_DIR / u.path.lstrip("/")).resolve()
                if f.parent != (WEB_DIR / "vendor").resolve() or not f.is_file():
                    return self._send(404, "not found", "text/plain")
                ctype = "application/javascript" if f.suffix == ".js" else "text/plain"
                return self._send(200, f.read_bytes(), ctype, {"Cache-Control": "max-age=86400"})
            if u.path == "/health":
                return self._send(200, "ok", "text/plain")
            self._send(404, "not found", "text/plain")
        except Exception as e:
            traceback.print_exc()
            self._send(500, json.dumps({"error": str(e)}, ensure_ascii=False), "application/json; charset=utf-8")

    def log_message(self, fmt, *args):
        print("  [web] " + fmt % args)


def _lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def _bind(host, port, tries=20):
    """Bind the server; if the port is taken (e.g. an older copy is still running) use the next free one."""
    for p in range(port, port + tries):
        try:
            return ThreadingHTTPServer((host, p), Handler), p
        except OSError as e:
            if e.errno not in (errno.EADDRINUSE, errno.EACCES):
                raise
            print(f"پورت {p} اشغال است (احتمالاً نسخه قبلی برنامه هنوز در حال اجراست).")
    raise OSError(f"no free port in {port}-{port + tries - 1}; stop old copies with:  pkill -f gold_analyzer")


def serve(host="0.0.0.0", port=None, open_browser=False):
    wanted = int(port or os.environ.get("PORT", 8000))
    httpd, port = _bind(host, wanted)
    if port != wanted:
        print(f"از پورت {port} استفاده شد. برای بستن نسخه قدیمی:  pkill -f gold_analyzer")
    url = f"http://localhost:{port}"
    print(f"داشبورد آماده است →  {url}")
    ip = _lan_ip()
    if ip:
        print(f"از گوشی/کامپیوتر دیگر در همین وای‌فای →  http://{ip}:{port}")
    print("برای توقف Ctrl+C بزنید.")
    if open_browser:
        if shutil.which("termux-open-url"):  # Termux (Android)
            subprocess.Popen(["termux-open-url", url])
        else:
            import webbrowser
            webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
