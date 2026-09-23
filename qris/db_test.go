package main

import (
	"database/sql"
	"fmt"
	"testing"
	"time"
)

type waitingPaymentRow struct{}

func (waitingPaymentRow) Scan(dest ...any) error {
	if len(dest) != 9 {
		return fmt.Errorf("got %d scan destinations, want 9", len(dest))
	}
	created := time.Date(2026, 8, 28, 15, 0, 0, 0, time.FixedZone("WIB", 7*60*60))
	values := []any{"payment-1", 50023, "payload", "waiting", created, nil, nil, nil, nil}
	for i, value := range values {
		switch out := dest[i].(type) {
		case *string:
			if value == nil {
				return fmt.Errorf("cannot scan NULL into *string")
			}
			*out = value.(string)
		case *int:
			*out = value.(int)
		case *PaymentStatus:
			*out = PaymentStatus(value.(string))
		case *time.Time:
			*out = value.(time.Time)
		case **time.Time:
			*out = nil
		case *sql.NullString:
			if value != nil {
				out.String, out.Valid = value.(string), true
			}
		default:
			return fmt.Errorf("unsupported scan destination %T", dest[i])
		}
	}
	return nil
}

func TestScanPaymentAcceptsNullableDatabaseFields(t *testing.T) {
	p, err := scanPayment(waitingPaymentRow{})
	if err != nil {
		t.Fatalf("scanPayment() error = %v", err)
	}
	if p.ID != "payment-1" || p.Status != StatusWaiting {
		t.Fatalf("scanPayment() = %+v", p)
	}
	if p.Source != "" || p.Message != "" || p.Error != "" {
		t.Fatalf("nullable fields = %q, %q, %q; want empty strings", p.Source, p.Message, p.Error)
	}
}
