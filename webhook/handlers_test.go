package main

import (
	"strings"
	"testing"
	"time"
)

func TestDecodeNotificationAcceptsStringAmountFromMobile(t *testing.T) {
	n, err := decodeNotification(strings.NewReader(`{
		"packageName":"id.dana",
		"appName":"DANA",
		"title":"Pembayaran diterima",
		"text":"Rp50.023",
		"postedAt":"2026-08-28T15:00:00+07:00",
		"amountDetected":"50023"
	}`))
	if err != nil {
		t.Fatalf("decodeNotification() error = %v", err)
	}
	if n.AmountDetected == nil || *n.AmountDetected != 50023 {
		t.Fatalf("AmountDetected = %v, want 50023", n.AmountDetected)
	}
	wantTime := time.Date(2026, 8, 28, 15, 0, 0, 0, time.FixedZone("WIB", 7*60*60))
	if !n.PostedAt.Equal(wantTime) {
		t.Fatalf("PostedAt = %v, want %v", n.PostedAt, wantTime)
	}
}

func TestNotificationQuerySelectsDetectedAmountsSincePayment(t *testing.T) {
	since := time.Date(2026, 8, 28, 15, 0, 0, 0, time.UTC)
	query, args := notificationQuery("id.dana", &since)

	if strings.Contains(query, "title ILIKE") {
		t.Fatal("notificationQuery() still filters a provider-specific title")
	}
	if !strings.Contains(query, "amount_detected IS NOT NULL") || !strings.Contains(query, "posted_at >= $1") || !strings.Contains(query, "package_name = $2") {
		t.Fatalf("notificationQuery() = %q, want amount, time, and package filters", query)
	}
	if len(args) != 2 || args[0] != since || args[1] != "id.dana" {
		t.Fatalf("notificationQuery() args = %#v, want since and package", args)
	}
}

func TestDecodeNotificationRejectsMissingRequiredFields(t *testing.T) {
	_, err := decodeNotification(strings.NewReader(`{"amountDetected":"50023"}`))
	if err == nil {
		t.Fatal("decodeNotification() error = nil, want validation error")
	}
}

func TestDecodeNotificationRejectsFractionalAmount(t *testing.T) {
	_, err := decodeNotification(strings.NewReader(`{
		"packageName":"id.dana",
		"postedAt":"2026-08-28T15:00:00+07:00",
		"amountDetected":50023.5
	}`))
	if err == nil {
		t.Fatal("decodeNotification() error = nil, want integer amount error")
	}
}
