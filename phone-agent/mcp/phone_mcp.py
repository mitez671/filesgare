#!/usr/bin/env python3
"""
phone_mcp.py - MCP server that gives Claude Code eyes and hands on the phone.

It talks to the "Phone Agent" Android app (HTTP on 127.0.0.1:8765) and exposes
its abilities as MCP tools over stdio. Pure Python standard library: no pip
install needed, works in proot Ubuntu and in plain Termux.

Register once (the app shows this command with your token filled in):
    claude mcp add phone -s user -e PHONE_TOKEN=<token> \
        -e PHONE_URL=http://127.0.0.1:8765 -- python3 ~/phone-agent/mcp/phone_mcp.py

Coordinates: every tool uses SCREENSHOT coordinates (the image Claude sees).
They are converted to real screen pixels here, so what Claude sees is what it taps.
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

URL = os.environ.get("PHONE_URL", "http://127.0.0.1:8765").rstrip("/")
TOKEN = os.environ.get("PHONE_TOKEN", "")
MAX_EDGE = int(os.environ.get("PHONE_MAX_EDGE", "1280"))   # longest side of screenshots
QUALITY = int(os.environ.get("PHONE_JPEG_QUALITY", "70"))

# Never route localhost through a proxy.
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
_scale = None  # screenshot px / real px


class PhoneError(Exception):
    pass


# ----------------------------------------------------------------- HTTP

def _call(method, path, body=None, query=None, raw=False, timeout=20):
    if not TOKEN or not TOKEN.isascii() or " " in TOKEN:
        raise PhoneError("PHONE_TOKEN is missing or invalid. Copy the real token "
                         "(32 letters/digits) from the Phone Agent app.")
    url = URL + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("X-Token", TOKEN)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with _opener.open(req, timeout=timeout) as r:
            payload = r.read()
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode()).get("error", str(e))
        except Exception:
            msg = str(e)
        raise PhoneError(f"phone app error {e.code}: {msg}")
    except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
        raise PhoneError(
            "cannot reach the Phone Agent app at %s (%s). Is the app installed and its "
            "accessibility service turned on?" % (URL, getattr(e, "reason", e)))
    if raw:
        return payload
    return json.loads(payload.decode("utf-8"))


def scale():
    global _scale
    if _scale is None:
        info = _call("GET", "/info")
        _scale = min(1.0, MAX_EDGE / float(max(info["width"], info["height"])))
    return _scale


def to_real(v):
    return float(v) / scale()


def to_shot(v):
    return int(round(float(v) * scale()))


# ---------------------------------------------------------------- tools

def t_screenshot(args):
    s = scale()
    jpg = _call("GET", "/screenshot", query={"scale": s, "q": QUALITY}, raw=True)
    info = _call("GET", "/info")
    w, h = to_shot(info["width"]), to_shot(info["height"])
    return [
        {"type": "image", "data": base64.b64encode(jpg).decode(), "mimeType": "image/jpeg"},
        {"type": "text", "text": f"Screenshot {w}x{h} (use these coordinates). "
                                 f"Foreground app: {info.get('package', '?')}"},
    ]


def t_ui_tree(args):
    res = _call("GET", "/tree")
    lines = [f"Foreground app: {res.get('package', '?')}",
             "x,y = center in screenshot coordinates | element"]
    for e in res.get("elements", []):
        parts = [e.get("cls", "")]
        if e.get("text"):
            parts.append(f'text="{e["text"]}"')
        if e.get("desc"):
            parts.append(f'desc="{e["desc"]}"')
        if e.get("id"):
            parts.append(f"id={e['id']}")
        if e.get("flags"):
            parts.append(f"[{e['flags']}]")
        lines.append(f"{to_shot(e['x'])},{to_shot(e['y'])} | " + " ".join(parts))
    if len(lines) == 2:
        lines.append("(no readable elements - this screen may be a game/canvas/video; use phone_screenshot)")
    return lines_text(lines)


def lines_text(lines):
    return [{"type": "text", "text": "\n".join(lines)}]


def ok_text(res, what):
    if res.get("ok"):
        return [{"type": "text", "text": f"OK: {what}"}]
    raise PhoneError(res.get("error") or f"failed: {what}")


def t_tap(a):
    return ok_text(_call("POST", "/tap", {"x": to_real(a["x"]), "y": to_real(a["y"])}),
                   f"tapped {a['x']},{a['y']}")


def t_long_press(a):
    return ok_text(_call("POST", "/longpress", {"x": to_real(a["x"]), "y": to_real(a["y"]),
                                                "ms": int(a.get("ms", 700))}),
                   f"long-pressed {a['x']},{a['y']}")


def t_swipe(a):
    return ok_text(_call("POST", "/swipe", {
        "x1": to_real(a["x1"]), "y1": to_real(a["y1"]),
        "x2": to_real(a["x2"]), "y2": to_real(a["y2"]),
        "ms": int(a.get("ms", 350))}), "swiped")


def t_scroll(a):
    info = _call("GET", "/info")
    w, h = info["width"], info["height"]
    cx, cy = w / 2, h / 2
    d = {"down": (cx, h * 0.70, cx, h * 0.30), "up": (cx, h * 0.30, cx, h * 0.70),
         "left": (w * 0.80, cy, w * 0.20, cy), "right": (w * 0.20, cy, w * 0.80, cy)}
    direction = a.get("direction", "down")
    if direction not in d:
        raise PhoneError("direction must be up/down/left/right")
    x1, y1, x2, y2 = d[direction]
    return ok_text(_call("POST", "/swipe", {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "ms": 400}),
                   f"scrolled {direction}")


def t_type(a):
    return ok_text(_call("POST", "/type", {"text": a["text"], "clear": bool(a.get("clear", False))}),
                   "typed text")


def t_key(a):
    return ok_text(_call("POST", "/key", {"key": a["key"]}), f"pressed {a['key']}")


def t_click_text(a):
    res = _call("POST", "/click_text", {"text": a["text"]})
    if res.get("ok"):
        return [{"type": "text",
                 "text": f"OK: clicked '{a['text']}' at {to_shot(res['x'])},{to_shot(res['y'])}"}]
    raise PhoneError(res.get("error", "not found"))


def t_open_app(a):
    pkg = a["package"]
    if "." not in pkg:  # looks like a name, try to resolve it
        apps = _call("GET", "/apps", query={"q": pkg}).get("apps", [])
        if not apps:
            raise PhoneError(f"no installed app matches '{pkg}'. Use phone_list_apps.")
        pkg = apps[0]["package"]
    return ok_text(_call("POST", "/open", {"package": pkg}), f"opened {pkg}")


def t_list_apps(a):
    apps = _call("GET", "/apps", query={"q": a.get("query", "")}).get("apps", [])
    return lines_text([f"{x['label']}  ->  {x['package']}" for x in apps] or ["(none)"])


def t_wait(a):
    ms = max(0, min(int(a.get("ms", 1000)), 30000))
    time.sleep(ms / 1000.0)
    return [{"type": "text", "text": f"waited {ms} ms"}]


XY = {"x": {"type": "number"}, "y": {"type": "number"}}

TOOLS = {
    "phone_screenshot": (t_screenshot,
        "Take a screenshot of the phone. Returns the image plus its size. "
        "All other tools use the coordinates of this image.", {}, []),
    "phone_ui_tree": (t_ui_tree,
        "List the visible UI elements (texts, buttons, inputs) with their center x,y. "
        "Cheaper and more precise than a screenshot - try this first.", {}, []),
    "phone_tap": (t_tap, "Tap at x,y (screenshot coordinates).", XY, ["x", "y"]),
    "phone_long_press": (t_long_press, "Long-press at x,y.",
        {**XY, "ms": {"type": "integer", "description": "duration, default 700"}}, ["x", "y"]),
    "phone_swipe": (t_swipe, "Swipe from (x1,y1) to (x2,y2).",
        {"x1": {"type": "number"}, "y1": {"type": "number"},
         "x2": {"type": "number"}, "y2": {"type": "number"},
         "ms": {"type": "integer", "description": "duration, default 350"}},
        ["x1", "y1", "x2", "y2"]),
    "phone_scroll": (t_scroll, "Scroll the screen content.",
        {"direction": {"type": "string", "enum": ["up", "down", "left", "right"]}}, ["direction"]),
    "phone_type": (t_type,
        "Type text into the currently focused input (tap the field first). "
        "Works with Persian and emoji.",
        {"text": {"type": "string"},
         "clear": {"type": "boolean", "description": "replace existing text instead of appending"}},
        ["text"]),
    "phone_key": (t_key, "Press a system key.",
        {"key": {"type": "string",
                 "enum": ["back", "home", "recents", "notifications", "quick_settings", "lock", "enter"]}},
        ["key"]),
    "phone_click_text": (t_click_text,
        "Click the first visible element whose text or description contains this text.",
        {"text": {"type": "string"}}, ["text"]),
    "phone_open_app": (t_open_app, "Open an app by package name (or by its name, e.g. 'Telegram').",
        {"package": {"type": "string"}}, ["package"]),
    "phone_list_apps": (t_list_apps, "List installed apps (optionally filtered).",
        {"query": {"type": "string"}}, []),
    "phone_wait": (t_wait, "Wait for the screen to settle (ms, default 1000).",
        {"ms": {"type": "integer"}}, []),
}


# ------------------------------------------------------------ MCP stdio

def send(msg):
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def handle(req):
    method, rid = req.get("method"), req.get("id")
    if rid is None:  # notification
        return
    if method == "initialize":
        pv = req.get("params", {}).get("protocolVersion", "2025-06-18")
        return send({"jsonrpc": "2.0", "id": rid, "result": {
            "protocolVersion": pv,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "phone-agent", "version": "1.0"},
            "instructions": "Tools to see and control the user's Android phone. Prefer "
                            "phone_ui_tree, use phone_screenshot when you need to see visuals. "
                            "Ask the user before sending messages, paying, deleting or "
                            "changing account settings."}})
    if method == "ping":
        return send({"jsonrpc": "2.0", "id": rid, "result": {}})
    if method == "tools/list":
        tools = [{"name": n, "description": d,
                  "inputSchema": {"type": "object", "properties": p, "required": r}}
                 for n, (_, d, p, r) in TOOLS.items()]
        return send({"jsonrpc": "2.0", "id": rid, "result": {"tools": tools}})
    if method == "tools/call":
        params = req.get("params", {})
        name, args = params.get("name"), params.get("arguments") or {}
        if name not in TOOLS:
            return send({"jsonrpc": "2.0", "id": rid,
                         "error": {"code": -32602, "message": f"unknown tool {name}"}})
        try:
            content = TOOLS[name][0](args)
            result = {"content": content}
        except PhoneError as e:
            result = {"content": [{"type": "text", "text": f"Error: {e}"}], "isError": True}
        except Exception as e:
            result = {"content": [{"type": "text", "text": f"Error: {type(e).__name__}: {e}"}],
                      "isError": True}
        return send({"jsonrpc": "2.0", "id": rid, "result": result})
    send({"jsonrpc": "2.0", "id": rid, "error": {"code": -32601, "message": f"unknown method {method}"}})


def main():
    if not TOKEN:
        sys.stderr.write("phone_mcp: PHONE_TOKEN is not set\n")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            handle(json.loads(line))
        except Exception as e:
            sys.stderr.write(f"phone_mcp: {e}\n")


if __name__ == "__main__":
    main()
