package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var pool *pgxpool.Pool

func main() {
	_ = godotenv.Load()

	ctx := context.Background()
	var err error
	pool, err = initDB(ctx)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	if err := migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/notifications", handleGetNotifications)
	mux.HandleFunc("POST /api/notifications", handleAddNotification)
	mux.HandleFunc("GET /health", handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("server running on :%s", port)
	if err := http.ListenAndServe(":"+port, logMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}