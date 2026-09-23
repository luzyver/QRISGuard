package com.qrisguard.listener

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.app.Notification
import android.content.pm.PackageManager
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class NotificationCaptureService : NotificationListenerService() {

    companion object {
        private const val WHITELIST_KEY = "whitelist"
        private var instance: NotificationCaptureService? = null

        fun getInstance(): NotificationCaptureService? = instance
    }

    private lateinit var webhookSender: NotificationWebhookSender

    override fun onCreate() {
        super.onCreate()
        instance = this
        webhookSender = NotificationWebhookSender(this)
    }

    override fun onDestroy() {
        webhookSender.close()
        instance = null
        super.onDestroy()
    }

    private fun getWhitelist(): Set<String> {
        val prefs = getSharedPreferences(NotificationWebhookSender.PREFS_NAME, MODE_PRIVATE)
        return prefs.getStringSet(WHITELIST_KEY, null) ?: emptySet()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            val packageName = sbn.packageName
            if (packageName == this.packageName) return
            if (!getWhitelist().contains(packageName)) return

            val notification = sbn.notification
            val extras = notification.extras

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            val postedAt = DateTimeFormatter.ISO_OFFSET_DATE_TIME
                .withZone(ZoneId.systemDefault())
                .format(Instant.ofEpochMilli(sbn.postTime))

            val appName = getAppName(packageName)

            webhookSender.enqueue(NotificationWebhookPayload(
                uniqueKey = "${packageName}_${sbn.postTime}_$title",
                packageName = packageName,
                appName = appName,
                title = title,
                text = text,
                subText = subText,
                bigText = bigText,
                postedAt = postedAt,
                amountDetected = NotificationAmountParser.detect(title, text, bigText)
            ))
        } catch (_: Exception) {}
    }

    private fun getAppName(packageName: String): String {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: PackageManager.NameNotFoundException) {
            packageName
        }
    }

    fun isPermissionGranted(): Boolean {
        val enabledPackages = android.provider.Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        )
        return enabledPackages?.contains(packageName) == true
    }
}
