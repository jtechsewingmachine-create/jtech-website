package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

func newTestServer() (*server, *memoryStore) {
	st := &memoryStore{}
	return &server{store: st, limiter: newRateLimiter(5, 10*time.Minute)}, st
}

func post(s *server, body string, mutate ...func(*http.Request)) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/enquiries", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for _, m := range mutate {
		m(req)
	}
	rec := httptest.NewRecorder()
	s.routes().ServeHTTP(rec, req)
	return rec
}

const valid = `{"name":"Asha","phone":"+91 98765 43210","intent":"product","model":"stylish-stitcher","message":"Can it hem jeans?"}`

func TestHealthz(t *testing.T) {
	s, _ := newTestServer()
	rec := httptest.NewRecorder()
	s.routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != `{"status":"ok"}` {
		t.Fatalf("got %d %q", rec.Code, rec.Body.String())
	}
}

func TestCreateEnquiry(t *testing.T) {
	cases := []struct {
		name   string
		body   string
		ctype  string
		status int
		stored int
	}{
		{"valid", valid, "application/json", 201, 1},
		{"valid with charset", valid, "application/json; charset=utf-8", 201, 1},
		{"no model", `{"name":"Ravi","phone":"08023456789","intent":"general"}`, "application/json", 201, 1},
		{"wrong content type", valid, "text/plain", 415, 0},
		{"bad json", `{"name":`, "application/json", 400, 0},
		{"trailing data", valid + `{"x":1}`, "application/json", 400, 0},
		{"too large", `{"name":"` + strings.Repeat("a", 9000) + `"}`, "application/json", 413, 0},
		{"invalid fields", `{"name":"a","phone":"123","intent":"order","model":"nope"}`, "application/json", 400, 0},
		{"honeypot", `{"name":"Bot","phone":"9876543210","intent":"general","website":"http://spam"}`, "application/json", 201, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s, st := newTestServer()
			rec := post(s, c.body, func(r *http.Request) { r.Header.Set("Content-Type", c.ctype) })
			if rec.Code != c.status || st.count() != c.stored {
				t.Fatalf("status %d stored %d, want %d/%d: %s", rec.Code, st.count(), c.status, c.stored, rec.Body.String())
			}
		})
	}
}

func TestStoreFailureIs503(t *testing.T) {
	s, st := newTestServer()
	st.fail = true
	if rec := post(s, valid); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestRateLimit(t *testing.T) {
	s, _ := newTestServer()
	for i := 0; i < 5; i++ {
		if rec := post(s, valid); rec.Code != 201 {
			t.Fatalf("request %d: %d", i, rec.Code)
		}
	}
	rec := post(s, valid)
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("6th request: %d retry=%q", rec.Code, rec.Header().Get("Retry-After"))
	}
	// Another client is unaffected.
	if rec := post(s, valid, func(r *http.Request) { r.RemoteAddr = "203.0.113.9:1234" }); rec.Code != 201 {
		t.Fatalf("other client: %d", rec.Code)
	}
}

func TestRateLimitWindowResets(t *testing.T) {
	l := newRateLimiter(1, time.Minute)
	now := time.Unix(0, 0)
	l.now = func() time.Time { return now }
	if ok, _ := l.allow("a"); !ok {
		t.Fatal("first")
	}
	if ok, _ := l.allow("a"); ok {
		t.Fatal("second should be limited")
	}
	now = now.Add(time.Minute)
	if ok, _ := l.allow("a"); !ok {
		t.Fatal("after window")
	}
}

func TestClientIPNeverTrustsForwardedFor(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "10.0.0.1:5000"
	req.Header.Set("X-Forwarded-For", "198.51.100.7")
	req.Header.Set("X-Client-IP", "198.51.100.8")
	if ip := (&server{}).clientIP(req); ip != "10.0.0.1" {
		t.Fatalf("no secret configured: %s", ip)
	}
	s := &server{proxySecret: "s3cret"}
	if ip := s.clientIP(req); ip != "10.0.0.1" {
		t.Fatalf("missing secret must not trust X-Client-IP: %s", ip)
	}
	req.Header.Set("X-Proxy-Secret", "s3cret")
	if ip := s.clientIP(req); ip != "198.51.100.8" {
		t.Fatalf("verified proxy: %s", ip)
	}
	req.Header.Set("X-Client-IP", "not-an-ip")
	if ip := s.clientIP(req); ip != "10.0.0.1" {
		t.Fatalf("junk X-Client-IP: %s", ip)
	}
}

func TestProxySecretRequiredWhenConfigured(t *testing.T) {
	s, st := newTestServer()
	s.proxySecret = "s3cret"
	if rec := post(s, valid); rec.Code != http.StatusForbidden {
		t.Fatalf("no secret: %d", rec.Code)
	}
	if rec := post(s, valid, func(r *http.Request) { r.Header.Set("X-Proxy-Secret", "wrong") }); rec.Code != http.StatusForbidden {
		t.Fatalf("wrong secret: %d", rec.Code)
	}
	// Spoofed client IPs through the real proxy still share the proxy-reported IP's bucket only.
	for i := 0; i < 6; i++ {
		rec := post(s, valid, func(r *http.Request) {
			r.Header.Set("X-Proxy-Secret", "s3cret")
			r.Header.Set("X-Client-IP", "203.0.113.5")
			r.Header.Set("X-Forwarded-For", fmt.Sprintf("10.9.9.%d", i))
		})
		want := 201
		if i == 5 {
			want = 429
		}
		if rec.Code != want {
			t.Fatalf("request %d: %d want %d", i, rec.Code, want)
		}
	}
	if st.count() != 5 {
		t.Fatalf("stored %d", st.count())
	}
}

func TestPhoneAcceptsUnicodeSpaces(t *testing.T) {
	if p, ok := normalisePhone("98765\u00a043210"); !ok || p != "9876543210" {
		t.Fatalf("NBSP: %q %v", p, ok)
	}
}

func TestValidateMirrorsWebRules(t *testing.T) {
	for _, ok := range []string{"9876543210", "+91 98765 43210", "098765-43210", "(080) 2345 6789", "91 9876543210"} {
		if _, good := normalisePhone(ok); !good {
			t.Errorf("phone %q should pass", ok)
		}
	}
	for _, bad := range []string{"", "12345", "0000000000", "1234567890", "+1 555 123 4567", "98765432101234"} {
		if _, good := normalisePhone(bad); good {
			t.Errorf("phone %q should fail", bad)
		}
	}
	base := EnquiryRequest{Name: "Asha", Phone: "9876543210", Intent: "general"}
	emojiName := base
	emojiName.Name = strings.Repeat("😀", 80) // 80 characters: allowed (code points, as in the web form)
	if _, errs := validate(emojiName); errs != nil {
		t.Errorf("80 emoji name rejected: %v", errs)
	}
	nul := base
	nul.Message = "hi\x00there"
	if _, errs := validate(nul); errs["message"] == "" {
		t.Error("NUL in message should be rejected")
	}
	long := base
	long.Message = strings.Repeat("x", 1001)
	if _, errs := validate(long); errs["message"] == "" {
		t.Error("1001-char message should be rejected")
	}
	e, _ := validate(EnquiryRequest{Name: "  Asha  ", Phone: "+91 98765 43210", Intent: "trade"})
	if e.Name != "Asha" || e.Phone != "9876543210" || e.Model != nil {
		t.Errorf("normalised enquiry wrong: %+v", e)
	}
}

// Fails if the web catalogue gains, loses or renames a model without updating knownModels.
func TestKnownModelsMatchWebCatalogue(t *testing.T) {
	src, err := os.ReadFile("../web/lib/products.ts")
	if err != nil {
		t.Skip("web catalogue not available:", err)
	}
	found := map[string]bool{}
	for _, m := range regexp.MustCompile(`slug: "([a-z0-9-]+)"`).FindAllStringSubmatch(string(src), -1) {
		found[m[1]] = true
	}
	if len(found) != len(knownModels) {
		t.Fatalf("web has %v, api has %v", found, knownModels)
	}
	for slug := range found {
		if !knownModels[slug] {
			t.Errorf("api is missing model %q", slug)
		}
	}
}
