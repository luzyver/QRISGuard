package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNotificationAmountAcceptsNumberAndString(t *testing.T) {
	for _, body := range []string{
		`{"amount_detected":50023}`,
		`{"amount_detected":"50023"}`,
	} {
		var n Notification
		if err := json.Unmarshal([]byte(body), &n); err != nil {
			t.Fatalf("json.Unmarshal(%s) error = %v", body, err)
		}
		if got := n.Amount(); got != 50023 {
			t.Fatalf("Amount() = %d, want 50023", got)
		}
	}
}

func TestFetchNotificationsRequestsOnlyEntriesSincePayment(t *testing.T) {
	since := time.Date(2026, 8, 28, 15, 0, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("since"); got != since.Format(time.RFC3339Nano) {
			t.Errorf("since query = %q, want %q", got, since.Format(time.RFC3339Nano))
		}
		fmt.Fprint(w, `{"success":true,"data":[]}`)
	}))
	defer server.Close()

	if _, err := NewAPIClient(server.URL).FetchNotifications(since); err != nil {
		t.Fatalf("FetchNotifications() error = %v", err)
	}
}

func TestNotificationRejectsMalformedAmount(t *testing.T) {
	var n Notification
	if err := json.Unmarshal([]byte(`{"amount_detected":"Rp50.023"}`), &n); err == nil {
		t.Fatal("json.Unmarshal() error = nil, want malformed amount error")
	}
}
