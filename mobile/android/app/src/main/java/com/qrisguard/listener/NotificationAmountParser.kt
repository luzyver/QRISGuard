package com.qrisguard.listener

internal object NotificationAmountParser {
    private val rupiah = Regex("""(?i)\bRp\s*([0-9]+(?:[.,][0-9]{3})*)""")

    fun detect(vararg texts: String?): String? {
        for (text in texts) {
            val amount = text?.let { rupiah.find(it)?.groupValues?.get(1) }
            if (amount != null) return amount.replace(".", "").replace(",", "")
        }
        return null
    }
}
