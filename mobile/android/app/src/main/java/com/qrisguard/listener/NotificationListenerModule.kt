package com.qrisguard.listener

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NotificationListenerModule.NAME)
class NotificationListenerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "NotificationListener"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        val service = NotificationCaptureService.getInstance()
        if (service != null) {
            promise.resolve(service.isPermissionGranted())
        } else {
            val ctx = reactApplicationContext
            val enabledPackages = android.provider.Settings.Secure.getString(
                ctx.contentResolver,
                "enabled_notification_listeners"
            )
            promise.resolve(enabledPackages?.contains(ctx.packageName) == true)
        }
    }

    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setWhitelist(apps: ReadableArray, promise: Promise) {
        try {
            val set = mutableSetOf<String>()
            for (i in 0 until apps.size()) {
                apps.getString(i)?.let { set.add(it) }
            }
            val prefs = reactApplicationContext.getSharedPreferences(NotificationWebhookSender.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().putStringSet("whitelist", set).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getWhitelist(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(NotificationWebhookSender.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            val set = prefs.getStringSet("whitelist", null) ?: emptySet()
            val array = com.facebook.react.bridge.WritableNativeArray()
            for (item in set) array.pushString(item)
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBackendUrl(url: String, promise: Promise) {
        reactApplicationContext
            .getSharedPreferences(NotificationWebhookSender.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(NotificationWebhookSender.BACKEND_URL_KEY, url.trim())
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getBackendUrl(promise: Promise) {
        val url = reactApplicationContext
            .getSharedPreferences(NotificationWebhookSender.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            .getString(NotificationWebhookSender.BACKEND_URL_KEY, null)
        promise.resolve(url)
    }
}
