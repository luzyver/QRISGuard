package com.qrisguard.listener

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationAmountParserTest {
    @Test
    fun detectsFormattedAndUnformattedRupiahAmounts() {
        assertEquals("50023", NotificationAmountParser.detect("Pembayaran Rp50.023 diterima"))
        assertEquals("50023", NotificationAmountParser.detect("Masuk Rp 50023"))
        assertEquals("1250000", NotificationAmountParser.detect("Rp1,250,000"))
    }

    @Test
    fun checksNotificationFieldsInOrder() {
        assertEquals("50023", NotificationAmountParser.detect("Tanpa nominal", "Rp50.023", "Rp60.000"))
        assertNull(NotificationAmountParser.detect("Tanpa nominal", null, ""))
    }
}
