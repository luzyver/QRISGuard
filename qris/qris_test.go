package main

import "testing"

func TestBuildDynamicQRISRejectsMalformedPayload(t *testing.T) {
	for _, payload := range []string{"", "123", "0002010102116304ABCD"} {
		if _, err := BuildDynamicQRIS(payload, 50023); err == nil {
			t.Fatalf("BuildDynamicQRIS(%q) error = nil, want invalid format error", payload)
		}
	}
}
