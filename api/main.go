// Command api serves the Jtech enquiry API. Pages are rendered by Next.js (see web/).
package main

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const maxBody = 8 << 10 // 8 KiB: far above a valid enquiry, small enough to shed junk

type server struct {
	store   Store
	limiter *rateLimiter
	// proxySecret is shared with the Next route handler (web/app/api/enquiries/route.ts). When set, every
	// request must carry it, and only then is X-Client-IP trusted. Empty = local development.
	proxySecret string
}

func (s *server) routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("POST /api/enquiries", s.createEnquiry)
	return mux
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// fromProxy reports whether the request carries the shared proxy secret (constant-time compare).
func (s *server) fromProxy(r *http.Request) bool {
	got := r.Header.Get("X-Proxy-Secret")
	return s.proxySecret != "" && subtle.ConstantTimeCompare([]byte(got), []byte(s.proxySecret)) == 1
}

// clientIP is the visitor IP the authenticated proxy reports, else the TCP peer. X-Forwarded-For is
// never trusted: callers can forge it, and the API host is reachable directly.
func (s *server) clientIP(r *http.Request) string {
	if s.fromProxy(r) {
		if ip := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Client-IP"))); ip != nil {
			return ip.String()
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (s *server) createEnquiry(w http.ResponseWriter, r *http.Request) {
	if s.proxySecret != "" && !s.fromProxy(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	// Every request counts toward the limit, including junk ones.
	if ok, retry := s.limiter.allow(s.clientIP(r)); !ok {
		w.Header().Set("Retry-After", strconv.Itoa(retry))
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many enquiries, try again later"})
		return
	}
	if ct, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); ct != "application/json" {
		writeJSON(w, http.StatusUnsupportedMediaType, map[string]string{"error": "content type must be application/json"})
		return
	}

	var req EnquiryRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody))
	if err := dec.Decode(&req); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "request too large"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if dec.More() { // exactly one JSON object
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	// Honeypot filled: pretend success so bots learn nothing, store nothing.
	if strings.TrimSpace(req.Website) != "" {
		writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
		return
	}

	e, errs := validate(req)
	if errs != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"errors": errs})
		return
	}
	if err := s.store.Save(r.Context(), e); err != nil {
		log.Printf("enquiry save failed: %v", err) // no personal data in logs
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "enquiry could not be saved"})
		return
	}
	log.Printf("enquiry saved: intent=%s", e.Intent)
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func storeFromEnv() Store {
	url, key := os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SECRET_KEY")
	if url != "" && key != "" {
		if !strings.HasPrefix(url, "https://") {
			log.Fatal("SUPABASE_URL must be https")
		}
		return newSupabaseStore(url, key)
	}
	if os.Getenv("APP_ENV") == "production" {
		log.Fatal("SUPABASE_URL and SUPABASE_SECRET_KEY are required in production")
	}
	log.Print("WARNING: no Supabase config; enquiries are kept in memory only (development)")
	return &memoryStore{}
}

func main() {
	s := &server{
		store:       storeFromEnv(),
		limiter:     newRateLimiter(envInt("RATE_LIMIT", 5), 10*time.Minute),
		proxySecret: os.Getenv("PROXY_SECRET"),
	}
	if s.proxySecret == "" && os.Getenv("APP_ENV") == "production" {
		log.Fatal("PROXY_SECRET is required in production")
	}
	addr := ":" + envOr("PORT", "8080")
	srv := &http.Server{
		Addr:              addr,
		Handler:           s.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
	log.Printf("api listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}

// envInt reads a positive integer env var, falling back on absence or junk.
func envInt(key string, fallback int) int {
	if n, err := strconv.Atoi(os.Getenv(key)); err == nil && n > 0 {
		return n
	}
	return fallback
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
