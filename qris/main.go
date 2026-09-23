package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	apiURL := os.Getenv("API_URL")
	qrisStatic := os.Getenv("QRIS_STATIC")
	if apiURL == "" || qrisStatic == "" {
		log.Fatal("API_URL and QRIS_STATIC environment variables are required")
	}

	db, err := NewDB()
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	pollSec := 5
	if v := os.Getenv("POLL_INTERVAL_SEC"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			pollSec = n
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	svc := NewService(apiURL, qrisStatic, pollSec, db)
	svc.ResumeWaitingPayments()

	h := NewHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/payments", h.CreatePayment)
	mux.HandleFunc("GET /api/payments/{id}", h.GetPayment)
	mux.HandleFunc("GET /api/payments/{id}/qr", h.GetQR)
	mux.HandleFunc("DELETE /api/payments/{id}", h.CancelPayment)

	log.Printf("QRIS service running on :%s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), mux); err != nil {
		log.Fatal(err)
	}
}
