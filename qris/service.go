package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"
)

// PaymentStatus represents the current state of a payment.
type PaymentStatus string

const (
	StatusWaiting PaymentStatus = "waiting"
	StatusPaid    PaymentStatus = "paid"
	StatusError   PaymentStatus = "error"
)

// Payment holds all data for a single payment verification session.
type Payment struct {
	ID        string        `json:"id"`
	Amount    int           `json:"amount"`
	QRPayload string        `json:"qr_payload"`
	Status    PaymentStatus `json:"status"`
	CreatedAt time.Time     `json:"created_at"`
	PaidAt    *time.Time    `json:"paid_at,omitempty"`
	Source    string        `json:"source,omitempty"`
	Message   string        `json:"message,omitempty"`
	Error     string        `json:"error,omitempty"`
}

// Service manages payment sessions and verification polling.
type Service struct {
	qrisStatic string
	pollSec    int
	api        *APIClient
	db         *DB

	mu      sync.Mutex
	cancels map[string]context.CancelFunc
}

// NewService creates a new payment verification service.
func NewService(apiURL, qrisStatic string, pollSec int, db *DB) *Service {
	return &Service{
		qrisStatic: qrisStatic,
		pollSec:    pollSec,
		api:        NewAPIClient(apiURL),
		db:         db,
		cancels:    make(map[string]context.CancelFunc),
	}
}

// ResumeWaitingPayments resumes polling for payments that were waiting before restart.
func (s *Service) ResumeWaitingPayments() {
	payments, err := s.db.GetWaitingPayments()
	if err != nil {
		log.Printf("resume waiting payments: %v", err)
		return
	}
	for _, p := range payments {
		ctx, cancel := context.WithCancel(context.Background())
		s.mu.Lock()
		s.cancels[p.ID] = cancel
		s.mu.Unlock()
		go s.pollLoop(ctx, p.ID, p.Amount, p.CreatedAt)
	}
}

// CreatePayment creates a new payment session with a unique amount and starts polling.
func (s *Service) CreatePayment(baseAmount int) (*Payment, error) {
	if baseAmount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	amount := generateUniqueAmount(baseAmount)
	payload, err := BuildDynamicQRIS(s.qrisStatic, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to build QRIS: %w", err)
	}

	id := fmt.Sprintf("%d-%d", time.Now().UnixNano(), rand.Int63())
	now := time.Now()

	p := &Payment{
		ID:        id,
		Amount:    amount,
		QRPayload: payload,
		Status:    StatusWaiting,
		CreatedAt: now,
	}

	if err := s.db.InsertPayment(p); err != nil {
		return nil, fmt.Errorf("failed to save payment: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancels[id] = cancel
	s.mu.Unlock()

	go s.pollLoop(ctx, id, amount, now)

	return p, nil
}

// GetPayment returns the current state of a payment session.
func (s *Service) GetPayment(id string) (*Payment, error) {
	return s.db.GetPayment(id)
}

// CancelPayment stops polling and removes a payment session.
func (s *Service) CancelPayment(id string) error {
	s.mu.Lock()
	if cancel, ok := s.cancels[id]; ok {
		cancel()
		delete(s.cancels, id)
	}
	s.mu.Unlock()

	return s.db.DeletePayment(id)
}

func (s *Service) pollLoop(ctx context.Context, id string, amount int, startTime time.Time) {
	ticker := time.NewTicker(time.Duration(s.pollSec) * time.Second)
	defer ticker.Stop()

	for {
		result := s.verifyPayment(amount, startTime)
		if result.Paid {
			if err := s.db.UpdatePaymentPaid(id, result.Source, result.Message); err != nil {
				log.Printf("mark payment %s paid: %v", id, err)
			} else {
				s.mu.Lock()
				delete(s.cancels, id)
				s.mu.Unlock()
				return
			}
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

type verifyResult struct {
	Paid    bool
	Source  string
	Message string
}

func (s *Service) verifyPayment(amount int, startTime time.Time) verifyResult {
	res, err := s.api.FetchNotifications(startTime)
	if err != nil || !res.Success || res.Data == nil {
		return verifyResult{}
	}
	return matchPaymentNotification(res.Data, amount, startTime)
}

func matchPaymentNotification(notifications []Notification, amount int, startTime time.Time) verifyResult {
	for _, n := range notifications {
		if n.Amount() == amount {
			posted, err := time.Parse(time.RFC3339, n.PostedAt)
			if err != nil {
				continue
			}
			if !posted.Before(startTime) {
				source := n.AppName
				if n.PackageName != "" {
					source = fmt.Sprintf("%s (%s)", n.AppName, n.PackageName)
				}
				msg := n.Title
				if msg == "" {
					msg = n.Text
				}
				return verifyResult{Paid: true, Source: source, Message: msg}
			}
		}
	}
	return verifyResult{}
}

func generateUniqueAmount(base int) int {
	if base < 1000 {
		return base + rand.Intn(9) + 1
	}
	return base + rand.Intn(90) + 10
}
