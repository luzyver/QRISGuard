package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type notificationAmount int64

func (a *notificationAmount) UnmarshalJSON(data []byte) error {
	raw := strings.Trim(string(data), `"`)
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid amountDetected: %w", err)
	}
	*a = notificationAmount(value)
	return nil
}

func decodeNotification(body io.Reader) (notification, error) {
	var payload struct {
		DeviceID       *string             `json:"deviceId"`
		PackageName    string              `json:"packageName"`
		AppName        *string             `json:"appName"`
		Title          *string             `json:"title"`
		Text           *string             `json:"text"`
		SubText        *string             `json:"subText"`
		BigText        *string             `json:"bigText"`
		PostedAt       string              `json:"postedAt"`
		AmountDetected *notificationAmount `json:"amountDetected"`
	}
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		return notification{}, fmt.Errorf("invalid body: %w", err)
	}
	if strings.TrimSpace(payload.PackageName) == "" {
		return notification{}, fmt.Errorf("packageName is required")
	}
	postedAt, err := time.Parse(time.RFC3339, payload.PostedAt)
	if err != nil {
		return notification{}, fmt.Errorf("postedAt must use RFC3339 format")
	}

	var amount *int64
	if payload.AmountDetected != nil {
		value := int64(*payload.AmountDetected)
		amount = &value
	}
	return notification{
		DeviceID: payload.DeviceID, PackageName: payload.PackageName,
		AppName: payload.AppName, Title: payload.Title, Text: payload.Text,
		SubText: payload.SubText, BigText: payload.BigText,
		PostedAt: postedAt, AmountDetected: amount,
	}, nil
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeResponse(w, http.StatusOK, success(nil, "ok"))
}

func handleAddNotification(w http.ResponseWriter, r *http.Request) {
	n, err := decodeNotification(r.Body)
	if err != nil {
		writeResponse(w, http.StatusBadRequest, failure("invalid body", 400, err))
		return
	}

	row, err := insertNotification(r.Context(), pool, n)
	if err != nil {
		writeResponse(w, http.StatusInternalServerError, failure("gagal menyimpan notifikasi", 500, err))
		return
	}
	writeResponse(w, http.StatusOK, success([]notification{*row}, "notifikasi berhasil disimpan"))
}

func handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	pkg := r.URL.Query().Get("packageName")
	var since *time.Time
	if raw := r.URL.Query().Get("since"); raw != "" {
		value, err := time.Parse(time.RFC3339Nano, raw)
		if err != nil {
			writeResponse(w, http.StatusBadRequest, failure("invalid since", 400, err))
			return
		}
		since = &value
	}

	rows, err := fetchNotifications(r.Context(), pool, pkg, since)
	if err != nil {
		writeResponse(w, http.StatusInternalServerError, failure("gagal mengambil notifikasi", 500, err))
		return
	}
	if rows == nil {
		rows = []notification{}
	}

	writeResponse(w, http.StatusOK, success(rows, "berhasil mengambil notifikasi"))
}
