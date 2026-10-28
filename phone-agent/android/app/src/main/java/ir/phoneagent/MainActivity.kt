package ir.phoneagent

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast

/** Small control panel: status, secret token, setup command, pause switch. */
class MainActivity : Activity() {

    private lateinit var status: TextView
    private lateinit var tokenView: TextView
    private lateinit var cmdView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (16 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad * 2, pad, pad)
            layoutDirection = View.LAYOUT_DIRECTION_RTL
        }

        fun label(t: String, size: Float = 15f, bold: Boolean = false) = TextView(this).apply {
            text = t
            textSize = size
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setPadding(0, pad / 2, 0, pad / 2)
        }
        fun button(t: String, onClick: () -> Unit) = Button(this).apply {
            text = t
            isAllCaps = false
            setOnClickListener { onClick() }
        }

        root.addView(label("Phone Agent", 24f, true))
        root.addView(label("چشم و دست Claude Code روی این گوشی"))

        status = label("", 16f, true)
        root.addView(status)

        root.addView(button("۱. روشن کردن در تنظیمات دسترسی‌پذیری") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        })

        root.addView(label("۲. توکن مخفی (به هیچ‌کس نده):", 15f, true))
        tokenView = TextView(this).apply {
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            gravity = Gravity.LEFT
        }
        root.addView(tokenView)

        root.addView(label("۳. این دستور را در اوبونتوی Termux بزن:", 15f, true))
        cmdView = TextView(this).apply {
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            setBackgroundColor(Color.parseColor("#EEEEEE"))
            setPadding(pad / 2, pad / 2, pad / 2, pad / 2)
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            gravity = Gravity.LEFT
        }
        root.addView(cmdView)
        root.addView(button("کپی دستور") { copy(cmdView.text.toString()) })
        root.addView(button("توکن جدید (توکن قبلی باطل می‌شود)") {
            Prefs.regenerate(this); refresh()
            Toast.makeText(this, "توکن عوض شد؛ دستور را دوباره اجرا کن", Toast.LENGTH_LONG).show()
        })

        root.addView(Switch(this).apply {
            text = "توقف موقت (Claude نمی‌تواند کاری بکند)"
            textSize = 15f
            isChecked = Prefs.paused(this@MainActivity)
            setPadding(0, pad, 0, pad)
            setOnCheckedChangeListener { _, v -> Prefs.setPaused(this@MainActivity, v); refresh() }
        })

        root.addView(label(
            "نکته: اگر در اندروید ۱۳ به بالا گزینه خاکستری بود، به اطلاعات برنامه (App info) " +
            "برو، منوی ⋮ بالا را بزن و «Allow restricted settings» را انتخاب کن.", 13f))

        setContentView(ScrollView(this).apply { addView(root) })
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val running = AgentService.instance != null
        val paused = Prefs.paused(this)
        status.text = when {
            !running -> "● خاموش — سرویس دسترسی‌پذیری را روشن کن"
            paused -> "● متوقف شده"
            else -> "● روشن — در حال گوش دادن روی 127.0.0.1:${Prefs.port(this)}"
        }
        status.setTextColor(
            when {
                !running -> Color.parseColor("#C62828")
                paused -> Color.parseColor("#EF6C00")
                else -> Color.parseColor("#2E7D32")
            }
        )
        val token = Prefs.token(this)
        tokenView.text = token
        cmdView.text = "claude mcp add phone -s user " +
                "-e PHONE_TOKEN=$token -e PHONE_URL=http://127.0.0.1:${Prefs.port(this)} " +
                "-- python3 ~/phone-agent/mcp/phone_mcp.py"
    }

    private fun copy(text: String) {
        getSystemService(ClipboardManager::class.java)
            .setPrimaryClip(ClipData.newPlainText("phone-agent", text))
        Toast.makeText(this, "کپی شد", Toast.LENGTH_SHORT).show()
    }
}
