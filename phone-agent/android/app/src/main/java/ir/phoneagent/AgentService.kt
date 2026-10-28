package ir.phoneagent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Path
import android.graphics.Point
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * The "eyes and hands": an accessibility service that can take screenshots,
 * read the UI tree, and perform taps / swipes / typing. It exposes all of
 * this through a tiny HTTP server bound to 127.0.0.1 (see LocalServer).
 */
class AgentService : AccessibilityService() {

    companion object {
        const val TAG = "PhoneAgent"
        @Volatile var instance: AgentService? = null
    }

    private val main = Handler(Looper.getMainLooper())
    private val shotExecutor = Executors.newSingleThreadExecutor()
    private var server: LocalServer? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        server = LocalServer(this, Prefs.port(this)).also { it.start() }
        Log.i(TAG, "service connected, server on ${Prefs.port(this)}")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) { /* not needed */ }
    override fun onInterrupt() {}

    override fun onDestroy() {
        server?.stop()
        server = null
        instance = null
        super.onDestroy()
    }

    // ---------------------------------------------------------------- info

    fun screenSize(): Point {
        val dm = getSystemService(DisplayManager::class.java)
        val p = Point()
        @Suppress("DEPRECATION")
        dm.getDisplay(Display.DEFAULT_DISPLAY).getRealSize(p)
        return p
    }

    fun currentPackage(): String = try {
        rootInActiveWindow?.packageName?.toString() ?: ""
    } catch (e: Exception) { "" }

    fun info(): JSONObject {
        val s = screenSize()
        return JSONObject()
            .put("width", s.x)
            .put("height", s.y)
            .put("package", currentPackage())
    }

    // ---------------------------------------------------------- screenshot

    /** Returns JPEG bytes scaled by [scale] (0.1..1.0). */
    fun screenshot(scale: Float, quality: Int): ByteArray {
        val latch = CountDownLatch(1)
        val result = AtomicReference<Bitmap?>(null)
        val error = AtomicReference<String?>(null)

        takeScreenshot(Display.DEFAULT_DISPLAY, shotExecutor,
            object : AccessibilityService.TakeScreenshotCallback {
                override fun onSuccess(shot: AccessibilityService.ScreenshotResult) {
                    try {
                        val hb = shot.hardwareBuffer
                        val hw = Bitmap.wrapHardwareBuffer(hb, shot.colorSpace)
                        result.set(hw?.copy(Bitmap.Config.ARGB_8888, false))
                        hw?.recycle()
                        hb.close()
                    } catch (e: Exception) {
                        error.set("convert failed: ${e.message}")
                    }
                    latch.countDown()
                }

                override fun onFailure(errorCode: Int) {
                    error.set(
                        when (errorCode) {
                            AccessibilityService.ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT -> "too fast, wait ~1s and retry"
                            AccessibilityService.ERROR_TAKE_SCREENSHOT_SECURE_WINDOW -> "this screen is protected (FLAG_SECURE), e.g. a banking app"
                            AccessibilityService.ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS -> "no screenshot permission"
                            else -> "screenshot failed, code $errorCode"
                        }
                    )
                    latch.countDown()
                }
            })

        if (!latch.await(5, TimeUnit.SECONDS)) throw IllegalStateException("screenshot timed out")
        error.get()?.let { throw IllegalStateException(it) }
        val full = result.get() ?: throw IllegalStateException("empty screenshot")

        val s = scale.coerceIn(0.1f, 1f)
        val bmp = if (s < 0.999f) {
            Bitmap.createScaledBitmap(full, (full.width * s).toInt(), (full.height * s).toInt(), true)
                .also { full.recycle() }
        } else full

        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, quality.coerceIn(20, 95), out)
        bmp.recycle()
        return out.toByteArray()
    }

    // ------------------------------------------------------------ gestures

    private fun gesture(path: Path, durationMs: Long): Boolean {
        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(1, 10_000))
        val g = GestureDescription.Builder().addStroke(stroke).build()
        val latch = CountDownLatch(1)
        val ok = AtomicReference(false)
        main.post {
            val dispatched = dispatchGesture(g, object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(d: GestureDescription?) { ok.set(true); latch.countDown() }
                override fun onCancelled(d: GestureDescription?) { latch.countDown() }
            }, main)
            if (!dispatched) latch.countDown()
        }
        latch.await(durationMs + 3000, TimeUnit.MILLISECONDS)
        return ok.get()
    }

    fun tap(x: Float, y: Float): Boolean =
        gesture(Path().apply { moveTo(x, y) }, 60)

    fun longPress(x: Float, y: Float, ms: Long): Boolean =
        gesture(Path().apply { moveTo(x, y) }, ms)

    fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, ms: Long): Boolean =
        gesture(Path().apply { moveTo(x1, y1); lineTo(x2, y2) }, ms)

    // -------------------------------------------------------------- typing

    private fun focusedInput(): AccessibilityNodeInfo? =
        rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)

    fun type(text: String, clear: Boolean): JSONObject {
        val node = focusedInput()
            ?: return JSONObject().put("ok", false)
                .put("error", "no focused text field - tap the field first")
        val existing = if (!clear && !node.isShowingHintText) node.text?.toString() ?: "" else ""
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, existing + text)
        }
        val ok = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        return JSONObject().put("ok", ok)
    }

    fun key(name: String): Boolean = when (name.lowercase()) {
        "back" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        "home" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
        "recents" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
        "notifications" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
        "quick_settings" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS)
        "lock" -> performGlobalAction(AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN)
        "enter" -> focusedInput()?.performAction(
            AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id
        ) ?: false
        else -> throw IllegalArgumentException("unknown key: $name")
    }

    // ---------------------------------------------------------------- apps

    fun openApp(pkg: String): Boolean {
        val intent = packageManager.getLaunchIntentForPackage(pkg) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        startActivity(intent)
        return true
    }

    fun listApps(query: String): JSONArray {
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val arr = JSONArray()
        packageManager.queryIntentActivities(i, 0)
            .map { it.loadLabel(packageManager).toString() to it.activityInfo.packageName }
            .distinctBy { it.second }
            .filter { query.isBlank() || it.first.contains(query, true) || it.second.contains(query, true) }
            .sortedBy { it.first.lowercase() }
            .forEach { arr.put(JSONObject().put("label", it.first).put("package", it.second)) }
        return arr
    }

    // ------------------------------------------------------------- UI tree

    private fun roots(): List<AccessibilityNodeInfo> {
        val list = try { windows.mapNotNull { it.root } } catch (e: Exception) { emptyList() }
        return list.ifEmpty { listOfNotNull(rootInActiveWindow) }
    }

    /** Flat list of interesting on-screen elements (text, buttons, inputs...). */
    fun uiTree(limit: Int = 400): JSONArray {
        val out = JSONArray()
        val r = Rect()
        fun walk(n: AccessibilityNodeInfo?, depth: Int) {
            if (n == null || out.length() >= limit || depth > 60) return
            if (n.isVisibleToUser) {
                val text = n.text?.toString()?.trim().orEmpty()
                val desc = n.contentDescription?.toString()?.trim().orEmpty()
                val interesting = text.isNotEmpty() || desc.isNotEmpty() ||
                        n.isClickable || n.isEditable || n.isScrollable || n.isCheckable
                if (interesting) {
                    n.getBoundsInScreen(r)
                    if (r.width() > 0 && r.height() > 0) {
                        val o = JSONObject()
                            .put("cls", n.className?.toString()?.substringAfterLast('.') ?: "")
                            .put("x", r.centerX()).put("y", r.centerY())
                            .put("bounds", "${r.left},${r.top},${r.right},${r.bottom}")
                        if (text.isNotEmpty()) o.put("text", text.take(200))
                        if (desc.isNotEmpty()) o.put("desc", desc.take(200))
                        n.viewIdResourceName?.let { o.put("id", it.substringAfter(":id/")) }
                        val flags = mutableListOf<String>()
                        if (n.isClickable) flags += "click"
                        if (n.isLongClickable) flags += "long"
                        if (n.isEditable) flags += "edit"
                        if (n.isScrollable) flags += "scroll"
                        if (n.isCheckable) flags += if (n.isChecked) "checked" else "unchecked"
                        if (n.isFocused) flags += "focused"
                        if (!n.isEnabled) flags += "disabled"
                        if (flags.isNotEmpty()) o.put("flags", flags.joinToString(","))
                        out.put(o)
                    }
                }
            }
            for (i in 0 until n.childCount) walk(n.getChild(i), depth + 1)
        }
        roots().forEach { walk(it, 0) }
        return out
    }

    /** Clicks the first visible element whose text/description contains [text]. */
    fun clickText(text: String): JSONObject {
        for (root in roots()) {
            val matches = root.findAccessibilityNodeInfosByText(text).filter { it.isVisibleToUser }
            val node = matches.firstOrNull() ?: continue
            var cur: AccessibilityNodeInfo? = node
            while (cur != null && !cur.isClickable) cur = cur.parent
            val r = Rect()
            node.getBoundsInScreen(r)
            if (cur != null && cur.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                return JSONObject().put("ok", true).put("x", r.centerX()).put("y", r.centerY())
            }
            val ok = tap(r.exactCenterX(), r.exactCenterY())
            return JSONObject().put("ok", ok).put("x", r.centerX()).put("y", r.centerY())
        }
        return JSONObject().put("ok", false).put("error", "no visible element contains '$text'")
    }
}
