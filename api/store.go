package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Store saves an enquiry. Implementations must not log personal data.
type Store interface {
	Save(ctx context.Context, e Enquiry) error
}

// supabaseStore writes through Supabase's REST API with the server-side secret key.
// The table has RLS on and no policies, so only this key can write (and nothing can read from a browser).
type supabaseStore struct {
	url    string // https://<ref>.supabase.co
	key    string
	client *http.Client
}

func newSupabaseStore(url, key string) *supabaseStore {
	return &supabaseStore{url: strings.TrimRight(url, "/"), key: key, client: &http.Client{Timeout: 5 * time.Second}}
}

func (s *supabaseStore) Save(ctx context.Context, e Enquiry) error {
	body, err := json.Marshal(e)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url+"/rest/v1/enquiries", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")
	req.Header.Set("apikey", s.key)
	// Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only need apikey.
	if strings.Count(s.key, ".") == 2 {
		req.Header.Set("Authorization", "Bearer "+s.key)
	}
	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	io.Copy(io.Discard, io.LimitReader(res.Body, 64<<10)) // drain so the connection is reused
	if res.StatusCode != http.StatusCreated && res.StatusCode != http.StatusNoContent {
		return fmt.Errorf("supabase insert: status %d", res.StatusCode)
	}
	return nil
}

// memoryStore keeps enquiries in memory. Used for local development and tests only.
type memoryStore struct {
	mu    sync.Mutex
	items []Enquiry
	fail  bool
}

func (m *memoryStore) Save(_ context.Context, e Enquiry) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail {
		return fmt.Errorf("memory store: forced failure")
	}
	m.items = append(m.items, e)
	return nil
}

func (m *memoryStore) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.items)
}
