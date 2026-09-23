package main

import (
	"encoding/json"
	"net/http"
	"strconv"

	qrcode "github.com/skip2/go-qrcode"
)

// Handler provides HTTP endpoints for payment verification.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler wrapping the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type createRequest struct {
	BaseAmount int `json:"base_amount"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// CreatePayment handles POST /api/payments
func (h *Handler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	p, err := h.svc.CreatePayment(req.BaseAmount)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, p)
}

// GetPayment handles GET /api/payments/{id}
func (h *Handler) GetPayment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.svc.GetPayment(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "payment not found"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// GetQR handles GET /api/payments/{id}/qr — returns QR code as PNG image.
func (h *Handler) GetQR(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.svc.GetPayment(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "payment not found"})
		return
	}

	size := 256
	if s := r.URL.Query().Get("size"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 && v <= 1024 {
			size = v
		}
	}

	png, err := qrcode.Encode(p.QRPayload, qrcode.Medium, size)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to generate QR"})
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Write(png)
}

// CancelPayment handles DELETE /api/payments/{id}
func (h *Handler) CancelPayment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.CancelPayment(id); err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "payment not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
