package com.qrisguard.listener

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

internal data class NotificationWebhookPayload(
    val uniqueKey: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val text: String,
    val subText: String?,
    val bigText: String?,
    val postedAt: String,
    val amountDetected: String?
)

internal class NotificationWebhookSender(context: Context) {
    companion object {
        const val PREFS_NAME = "qrisguard"
        const val BACKEND_URL_KEY = "backend_url"
        private const val SENT_KEYS_KEY = "sent_notifications"
        private const val MAX_CACHE_SIZE = 5000
        private const val MAX_ATTEMPTS = 3
        private const val TAG = "QRISGuardWebhook"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val executor = Executors.newSingleThreadExecutor()

    fun enqueue(payload: NotificationWebhookPayload) {
        executor.execute {
            val url = prefs.getString(BACKEND_URL_KEY, null)?.trim().orEmpty()
            if (url.isEmpty() || isSent(payload.uniqueKey)) return@execute

            repeat(MAX_ATTEMPTS) { attempt ->
                val status = post(url, payload)
                if (status != null && status in 200..299) {
                    markSent(payload.uniqueKey)
                    return@execute
                }
                if (status != null && status < 500 && status != 429) {
                    Log.w(TAG, "Webhook rejected notification with HTTP $status")
                    return@execute
                }
                if (attempt < MAX_ATTEMPTS - 1) {
                    try {
                        Thread.sleep((attempt + 1) * 1000L)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                        return@execute
                    }
                }
            }
            Log.w(TAG, "Webhook failed after $MAX_ATTEMPTS attempts")
        }
    }

    fun close() {
        executor.shutdown()
        if (!executor.awaitTermination(2, TimeUnit.SECONDS)) executor.shutdownNow()
    }

    private fun isSent(key: String): Boolean =
        prefs.getStringSet(SENT_KEYS_KEY, emptySet())?.contains(key) == true

    private fun markSent(key: String) {
        val keys = prefs.getStringSet(SENT_KEYS_KEY, emptySet()).orEmpty().toMutableSet()
        if (keys.size >= MAX_CACHE_SIZE) keys.clear()
        keys.add(key)
        prefs.edit().putStringSet(SENT_KEYS_KEY, keys).apply()
    }

    private fun post(url: String, payload: NotificationWebhookPayload): Int? {
        var connection: HttpURLConnection? = null
        return try {
            connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")

            val body = JSONObject()
                .put("deviceId", JSONObject.NULL)
                .put("packageName", payload.packageName)
                .put("appName", payload.appName)
                .put("title", payload.title)
                .put("text", payload.text)
                .put("subText", payload.subText ?: JSONObject.NULL)
                .put("bigText", payload.bigText ?: JSONObject.NULL)
                .put("postedAt", payload.postedAt)
                .put("amountDetected", payload.amountDetected ?: JSONObject.NULL)

            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body.toString()) }
            connection.responseCode
        } catch (error: Exception) {
            Log.w(TAG, "Webhook request failed", error)
            null
        } finally {
            connection?.disconnect()
        }
    }
}
