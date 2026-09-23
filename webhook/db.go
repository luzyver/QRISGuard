package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initDB(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect db: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return pool, nil
}

const createTableSQL = `
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    device_id       TEXT,
    package_name    TEXT NOT NULL,
    app_name        TEXT,
    title           TEXT,
    text            TEXT,
    sub_text        TEXT,
    big_text        TEXT,
    posted_at       TIMESTAMPTZ NOT NULL,
    amount_detected NUMERIC,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_posted_at ON notifications (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_package   ON notifications (package_name);
CREATE INDEX IF NOT EXISTS idx_notifications_payments  ON notifications (posted_at DESC)
    WHERE amount_detected IS NOT NULL;
`

func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, createTableSQL)
	return err
}

type notification struct {
	ID             int64     `json:"id"`
	DeviceID       *string   `json:"device_id"`
	PackageName    string    `json:"package_name"`
	AppName        *string   `json:"app_name"`
	Title          *string   `json:"title"`
	Text           *string   `json:"text"`
	SubText        *string   `json:"sub_text"`
	BigText        *string   `json:"big_text"`
	PostedAt       time.Time `json:"posted_at"`
	AmountDetected *int64    `json:"amount_detected"`
}

func insertNotification(ctx context.Context, pool *pgxpool.Pool, n notification) (*notification, error) {
	const q = `INSERT INTO notifications
		(device_id, package_name, app_name, title, text, sub_text, big_text, posted_at, amount_detected)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, device_id, package_name, app_name, title, text, sub_text, big_text, posted_at, amount_detected`

	row := pool.QueryRow(ctx, q,
		n.DeviceID, n.PackageName, n.AppName, n.Title, n.Text, n.SubText, n.BigText, n.PostedAt, n.AmountDetected,
	)
	var out notification
	err := row.Scan(&out.ID, &out.DeviceID, &out.PackageName, &out.AppName,
		&out.Title, &out.Text, &out.SubText, &out.BigText, &out.PostedAt, &out.AmountDetected)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func notificationQuery(packageName string, since *time.Time) (string, []any) {
	q := `SELECT id, device_id, package_name, app_name, title, text, sub_text, big_text, posted_at, amount_detected
	      FROM notifications
	      WHERE amount_detected IS NOT NULL`
	args := []any{}
	if since != nil {
		args = append(args, *since)
		q += fmt.Sprintf(" AND posted_at >= $%d", len(args))
	}
	if packageName != "" {
		args = append(args, packageName)
		q += fmt.Sprintf(" AND package_name = $%d", len(args))
	}
	q += " ORDER BY posted_at DESC LIMIT 1000"
	return q, args
}

func fetchNotifications(ctx context.Context, pool *pgxpool.Pool, packageName string, since *time.Time) ([]notification, error) {
	q, args := notificationQuery(packageName, since)

	rows, err := pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []notification
	for rows.Next() {
		var n notification
		if err := rows.Scan(&n.ID, &n.DeviceID, &n.PackageName, &n.AppName,
			&n.Title, &n.Text, &n.SubText, &n.BigText, &n.PostedAt, &n.AmountDetected); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}
