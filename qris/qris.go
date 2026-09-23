package main

import (
	"fmt"
	"strings"
)

// BuildDynamicQRIS converts a static QRIS string into a dynamic QRIS
// with the specified transaction amount.
func BuildDynamicQRIS(staticQR string, amount int) (string, error) {
	if amount <= 0 {
		return "", fmt.Errorf("amount must be positive")
	}
	if len(staticQR) < 8 || staticQR[len(staticQR)-8:len(staticQR)-4] != "6304" {
		return "", fmt.Errorf("QRIS format invalid: missing CRC tag")
	}
	if !strings.Contains(staticQR, "010211") {
		return "", fmt.Errorf("QRIS format invalid: not a static QRIS")
	}
	// Remove last 4 chars (CRC) and switch from static (11) to dynamic (12)
	base := staticQR[:len(staticQR)-4]
	base = strings.Replace(base, "010211", "010212", 1)

	parts := strings.SplitN(base, "5802ID", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("QRIS format invalid: missing 5802ID separator")
	}

	// Build TLV for tag 54 (transaction amount)
	amt := fmt.Sprintf("%d", amount)
	amountTLV := fmt.Sprintf("54%02d%s", len(amt), amt)

	payload := parts[0] + amountTLV + "5802ID" + parts[1]
	return payload + CRC16(payload), nil
}

// CRC16 computes CRC-CCITT (0x1021) checksum, returned as uppercase hex string.
func CRC16(data string) string {
	crc := uint16(0xFFFF)
	for i := 0; i < len(data); i++ {
		crc ^= uint16(data[i]) << 8
		for j := 0; j < 8; j++ {
			if crc&0x8000 != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return fmt.Sprintf("%04X", crc)
}
