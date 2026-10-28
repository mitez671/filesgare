package ir.phoneagent

import android.util.Log
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.concurrent.Executors

/**
 * Minimal HTTP/1.1 server (no dependencies) listening ONLY on 127.0.0.1,
 * so it is reachable from Termux / proot-Ubuntu on the same phone but not
 * from the network. Every request must carry the secret token:
 *   header  "X-Token: <token>"   or   query "?token=<token>"
 *
 * Endpoints
 *   GET  /info                         -> {width,height,package}
 *   GET  /screenshot?scale=0.5&q=70    -> image/jpeg
 *   GET  /tree                         -> {elements:[...]}
 *   GET  /apps?q=telegram              -> {apps:[{label,package}]}
 *   POST /tap        {x,y}
 *   POST /longpress  {x,y,ms}
 *   POST /swipe      {x1,y1,x2,y2,ms}
 *   POST /type       {text,clear}
 *   POST /key        {key: back|home|recents|notifications|quick_settings|lock|enter}
 *   POST /open       {package}
 *   POST /click_text {text}
 * Coordinates are always real screen pixels.
 */
class LocalServer(private val svc: AgentService, private val port: Int) {

    private var socket: ServerSocket? = null
    private val pool = Executors.newFixedThreadPool(4)
    @Volatile private var running = false

    fun start() {
        running = true
        Thread({
            try {
                val ss = ServerSocket()
                ss.reuseAddress = true
                ss.bind(InetSocketAddress(InetAddress.getByName("127.0.0.1"), port), 16)
                socket = ss
                while (running) {
                    val client = ss.accept()
                    pool.execute { handle(client) }
                }
            } catch (e: Exception) {
                if (running) Log.e(AgentService.TAG, "server stopped: ${e.message}")
            }
        }, "agent-server").start()
    }

    fun stop() {
        running = false
        try { socket?.close() } catch (_: Exception) {}
        pool.shutdownNow()
    }

    // ------------------------------------------------------------------

    private fun readLine(input: InputStream): String? {
        val buf = ByteArrayOutputStream()
        while (true) {
            val b = input.read()
            if (b == -1) return if (buf.size() == 0) null else buf.toString("UTF-8")
            if (b == '\n'.code) break
            if (b != '\r'.code) buf.write(b)
            if (buf.size() > 16_384) throw IllegalStateException("header too long")
        }
        return buf.toString("UTF-8")
    }

    private fun handle(s: Socket) {
        s.use { sock ->
            sock.soTimeout = 30_000
            val input = sock.getInputStream().buffered()
            val out = sock.getOutputStream()
            try {
                val requestLine = readLine(input) ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return send(out, 400, json("error", "bad request"))
                val method = parts[0].uppercase()
                val target = parts[1]

                val headers = HashMap<String, String>()
                while (true) {
                    val line = readLine(input) ?: break
                    if (line.isEmpty()) break
                    val idx = line.indexOf(':')
                    if (idx > 0) headers[line.substring(0, idx).trim().lowercase()] =
                        line.substring(idx + 1).trim()
                }
                val len = headers["content-length"]?.toIntOrNull() ?: 0
                val body = if (len > 0) {
                    val bytes = ByteArray(len)
                    var read = 0
                    while (read < len) {
                        val n = input.read(bytes, read, len - read)
                        if (n < 0) break
                        read += n
                    }
                    String(bytes, 0, read, Charsets.UTF_8)
                } else ""

                val path = target.substringBefore('?')
                val query = parseQuery(target.substringAfter('?', ""))

                val token = headers["x-token"] ?: query["token"]
                if (token != Prefs.token(svc)) return send(out, 401, json("error", "bad or missing token"))
                if (Prefs.paused(svc) && path != "/info")
                    return send(out, 423, json("error", "agent is paused from the Phone Agent app"))

                route(method, path, query, if (body.isBlank()) JSONObject() else JSONObject(body), out)
            } catch (e: Exception) {
                try { send(out, 500, json("error", e.message ?: e.toString())) } catch (_: Exception) {}
            }
        }
    }

    private fun route(method: String, path: String, q: Map<String, String>, b: JSONObject, out: OutputStream) {
        fun f(k: String) = b.getDouble(k).toFloat()
        when ("$method $path") {
            "GET /info" -> send(out, 200, svc.info().put("ok", true))

            "GET /screenshot" -> {
                val scale = q["scale"]?.toFloatOrNull() ?: 0.5f
                val quality = q["q"]?.toIntOrNull() ?: 70
                send(out, 200, svc.screenshot(scale, quality), "image/jpeg")
            }

            "GET /tree" -> send(out, 200, JSONObject()
                .put("ok", true)
                .put("package", svc.currentPackage())
                .put("elements", svc.uiTree()))

            "GET /apps" -> send(out, 200, JSONObject().put("ok", true).put("apps", svc.listApps(q["q"] ?: "")))

            "POST /tap" -> send(out, 200, ok(svc.tap(f("x"), f("y"))))
            "POST /longpress" -> send(out, 200, ok(svc.longPress(f("x"), f("y"), b.optLong("ms", 700))))
            "POST /swipe" -> send(out, 200, ok(svc.swipe(f("x1"), f("y1"), f("x2"), f("y2"), b.optLong("ms", 350))))
            "POST /type" -> send(out, 200, svc.type(b.getString("text"), b.optBoolean("clear", false)))
            "POST /key" -> send(out, 200, ok(svc.key(b.getString("key"))))
            "POST /open" -> send(out, 200, ok(svc.openApp(b.getString("package"))))
            "POST /click_text" -> send(out, 200, svc.clickText(b.getString("text")))

            else -> send(out, 404, json("error", "unknown endpoint $method $path"))
        }
    }

    // ------------------------------------------------------------------

    private fun parseQuery(qs: String): Map<String, String> =
        qs.split('&').filter { it.contains('=') }.associate {
            URLDecoder.decode(it.substringBefore('='), "UTF-8") to
                    URLDecoder.decode(it.substringAfter('='), "UTF-8")
        }

    private fun ok(v: Boolean) = JSONObject().put("ok", v)
    private fun json(k: String, v: String) = JSONObject().put("ok", false).put(k, v)

    private fun send(out: OutputStream, code: Int, body: JSONObject) =
        send(out, code, body.toString().toByteArray(Charsets.UTF_8), "application/json; charset=utf-8")

    private fun send(out: OutputStream, code: Int, body: ByteArray, type: String) {
        val reason = when (code) {
            200 -> "OK"; 400 -> "Bad Request"; 401 -> "Unauthorized"; 404 -> "Not Found"
            423 -> "Locked"; else -> "Error"
        }
        val head = "HTTP/1.1 $code $reason\r\n" +
                "Content-Type: $type\r\n" +
                "Content-Length: ${body.size}\r\n" +
                "Connection: close\r\n\r\n"
        out.write(head.toByteArray(Charsets.UTF_8))
        out.write(body)
        out.flush()
    }
}
