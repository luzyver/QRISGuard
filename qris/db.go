package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	pool *pgxpool.Pool
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPayment(row rowScanner) (*Payment, error) {
	var p Payment
	var source, message, paymentError sql.NullString
	if err := row.Scan(&p.ID, &p.Amount, &p.QRPayload, &p.Status, &p.CreatedAt,
		&p.PaidAt, &source, &message, &paymentError); err != nil {
		return nil, err
	}
	p.Source, p.Message, p.Error = source.String, message.String, paymentError.String
	return &p, nil
}

func NewDB() (*DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	db := &DB{pool: pool}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}

func (db *DB) migrate() error {
	_, err := db.pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS payments (
			id TEXT PRIMARY KEY,
			amount INTEGER NOT NULL,
			qr_payload TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'waiting',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			paid_at TIMESTAMPTZ,
			source TEXT,
			message TEXT,
			error TEXT
		);
		CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
		CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
	`)
	return err
}

func (db *DB) InsertPayment(p *Payment) error {
	_, err := db.pool.Exec(context.Background(),
		`INSERT INTO payments (id, amount, qr_payload, status, created_at) VALUES ($1, $2, $3, $4, $5)`,
		p.ID, p.Amount, p.QRPayload, p.Status, p.CreatedAt,
	)
	return err
}

func (db *DB) GetPayment(id string) (*Payment, error) {
	row := db.pool.QueryRow(context.Background(),
		`SELECT id, amount, qr_payload, status, created_at, paid_at, source, message, error FROM payments WHERE id = $1`, id)
	return scanPayment(row)
}

func (db *DB) UpdatePaymentPaid(id, source, message string) error {
	now := time.Now()
	_, err := db.pool.Exec(context.Background(),
		`UPDATE payments SET status = 'paid', paid_at = $1, source = $2, message = $3 WHERE id = $4`,
		now, source, message, id,
	)
	return err
}

func (db *DB) DeletePayment(id string) error {
	_, err := db.pool.Exec(context.Background(),
		`DELETE FROM payments WHERE id = $1`, id)
	return err
}

func (db *DB) GetWaitingPayments() ([]Payment, error) {
	rows, err := db.pool.Query(context.Background(),
		`SELECT id, amount, qr_payload, status, created_at, paid_at, source, message, error FROM payments WHERE status = 'waiting' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []Payment
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		payments = append(payments, *p)
	}
	return payments, rows.Err()
}

func (db *DB) Close() {
	db.pool.Close()
}
