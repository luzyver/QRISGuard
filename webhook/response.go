package main

import (
	"encoding/json"
	"net/http"
)

type response struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data"`
	Error   any    `json:"error"`
}

func success(data any, message string) response {
	return response{Success: true, Message: message, Data: data, Error: nil}
}

func failure(message string, code int, err error) response {
	return response{Success: false, Message: message, Data: nil, Error: map[string]any{
		"code": code, "message": errText(err),
	}}
}

func errText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

// writeResponse serializes r to JSON. For a non-success response (Success==false)
// with a non-zero code it also sets the HTTP status accordingly.
func writeResponse(w http.ResponseWriter, code int, r response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(r)
}