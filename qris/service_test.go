package main

import (
	"testing"
	"time"
)

func amountPointer(value int) *notificationAmount {
	amount := notificationAmount(value)
	return &amount
}

func TestMatchPaymentNotificationUsesAmountAndStartTime(t *testing.T) {
	start := time.Date(2026, 8, 28, 15, 0, 0, 0, time.UTC)
	notifications := []Notification{
		{AmountDetected: amountPointer(50023), PostedAt: start.Add(-time.Second).Format(time.RFC3339), AppName: "DANA"},
		{AmountDetected: amountPointer(50024), PostedAt: start.Add(time.Second).Format(time.RFC3339), AppName: "DANA"},
		{AmountDetected: amountPointer(50023), PostedAt: start.Add(time.Second).Format(time.RFC3339), AppName: "DANA", PackageName: "id.dana", Title: "Pembayaran diterima"},
	}

	result := matchPaymentNotification(notifications, 50023, start)
	if !result.Paid || result.Source != "DANA (id.dana)" || result.Message != "Pembayaran diterima" {
		t.Fatalf("matchPaymentNotification() = %+v", result)
	}
}
