package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type notificationAmount int

func (a *notificationAmount) UnmarshalJSON(data []byte) error {
	raw := strings.Trim(string(data), `"`)
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fmt.Errorf("invalid amount_detected: %w", err)
	}
	*a = notificationAmount(value)
	return nil
}

// Notification represents a payment notification from the external API.
type Notification struct {
	AmountDetected *notificationAmount `json:"amount_detected"`
	PostedAt       string              `json:"posted_at"`
	AppName        string              `json:"app_name"`
	PackageName    string              `json:"package_name"`
	Title          string              `json:"title"`
	Text           string              `json:"text"`
}

func (n *Notification) Amount() int {
	if n.AmountDetected == nil {
		return 0
	}
	return int(*n.AmountDetected)
}

// APIResponse is the expected response structure from the notification API.
type APIResponse struct {
	Success bool           `json:"success"`
	Data    []Notification `json:"data"`
}

// APIClient fetches payment notifications from the external API.
type APIClient struct {
	url    string
	client *http.Client
}

// NewAPIClient creates a new API client with the given base URL.
func NewAPIClient(url string) *APIClient {
	return &APIClient{
		url: url,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// FetchNotifications retrieves the current list of payment notifications.
func (c *APIClient) FetchNotifications(since time.Time) (*APIResponse, error) {
	endpoint, err := url.Parse(c.url)
	if err != nil {
		return nil, fmt.Errorf("invalid API URL: %w", err)
	}
	query := endpoint.Query()
	query.Set("since", since.Format(time.RFC3339Nano))
	endpoint.RawQuery = query.Encode()

	resp, err := c.client.Get(endpoint.String())
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("invalid JSON response: %w", err)
	}

	return &result, nil
}
