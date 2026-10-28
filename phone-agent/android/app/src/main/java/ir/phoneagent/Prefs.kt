package ir.phoneagent

import android.content.Context
import java.security.SecureRandom

object Prefs {
    private const val FILE = "agent"
    const val DEFAULT_PORT = 8765

    private fun sp(c: Context) = c.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun port(c: Context): Int = sp(c).getInt("port", DEFAULT_PORT)

    fun token(c: Context): String {
        val existing = sp(c).getString("token", null)
        return existing ?: regenerate(c)
    }

    fun regenerate(c: Context): String {
        val bytes = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val t = bytes.joinToString("") { "%02x".format(it) }
        sp(c).edit().putString("token", t).apply()
        return t
    }

    fun paused(c: Context): Boolean = sp(c).getBoolean("paused", false)
    fun setPaused(c: Context, v: Boolean) = sp(c).edit().putBoolean("paused", v).apply()
}
