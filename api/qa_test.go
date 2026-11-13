package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func qaServer(limit int, secret string) *server {
	return &server{store: &memoryStore{}, limiter: newRateLimiter(limit, 600e9), proxySecret: secret}
}

func qaPost(s *server, peer string, h map[string]string) int {
	r := httptest.NewRequest("POST", "/api/enquiries", strings.NewReader(`{"name":"Asha","phone":"9876543210","intent":"general"}`))
	r.Header.Set("Content-Type", "application/json")
	r.RemoteAddr = peer + ":1234"
	for k, v := range h {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	s.routes().ServeHTTP(w, r)
	return w.Code
}

func TestQASpoofedHeadersIgnoredWithoutSecretConfigured(t *testing.T) {
	s := qaServer(2, "")
	for i := 0; i < 2; i++ {
		qaPost(s, "1.1.1.1", map[string]string{"X-Forwarded-For": "9.9.9.9", "X-Client-IP": "9.9.9.9"})
	}
	if c := qaPost(s, "1.1.1.1", map[string]string{"X-Forwarded-For": "8.8.8.8", "X-Client-IP": "8.8.8.8"}); c != 429 {
		t.Fatalf("spoof evaded limit: %d", c)
	}
}

func TestQASecretRequiredAndWrongSecretRejected(t *testing.T) {
	s := qaServer(5, "k")
	for _, h := range []map[string]string{nil, {"X-Proxy-Secret": "wrong"}, {"X-Proxy-Secret": ""}, {"X-Proxy-Secret": "kk"}, {"X-Proxy-Secret": "K"}, {"X-Client-IP": "5.5.5.5"}} {
		if c := qaPost(s, "1.1.1.1", h); c != 403 {
			t.Fatalf("%v -> %d", h, c)
		}
	}
	if c := qaPost(s, "1.1.1.1", map[string]string{"X-Proxy-Secret": "k"}); c != 201 {
		t.Fatalf("valid secret -> %d", c)
	}
}

func TestQAForbiddenRequestsDoNotConsumeLimit(t *testing.T) {
	s := qaServer(1, "k")
	for i := 0; i < 5; i++ {
		qaPost(s, "1.1.1.1", nil)
	}
	if c := qaPost(s, "1.1.1.1", map[string]string{"X-Proxy-Secret": "k", "X-Client-IP": "7.7.7.7"}); c != 201 {
		t.Fatalf("got %d", c)
	}
}

func TestQAClientIPOnlyHonouredWithSecretAndMustParse(t *testing.T) {
	s := qaServer(1, "k")
	ok := func(ip string) int { return qaPost(s, "1.1.1.1", map[string]string{"X-Proxy-Secret": "k", "X-Client-IP": ip, "X-Forwarded-For": "6.6.6.6"}) }
	if ok("5.5.5.5") != 201 || ok("7.7.7.7") != 201 { // distinct visitors get distinct buckets; XFF never used
		t.Fatal("distinct X-Client-IP should be distinct buckets")
	}
	if ok("5.5.5.5") != 429 {
		t.Fatal("same X-Client-IP should be limited")
	}
	// Unparseable values fall back to the peer: all share one bucket, so garbage cannot mint fresh buckets.
	a, b := ok("not-an-ip"), ok("also bad; drop")
	if a != 201 || b != 429 {
		t.Fatalf("garbage IPs: %d %d", a, b)
	}
	if ok("5.5.5.5 ") != 429 || ok("::ffff:5.5.5.5") != 429 {
		t.Fatal("whitespace / v4-mapped forms of a limited IP must normalise to the same bucket")
	}
}

func TestQATrailingDataAndWrongContentTypeCountTowardLimit(t *testing.T) {
	s := qaServer(2, "")
	post := func(ct, body string) int {
		r := httptest.NewRequest("POST", "/api/enquiries", strings.NewReader(body))
		r.Header.Set("Content-Type", ct)
		r.RemoteAddr = "3.3.3.3:1"
		w := httptest.NewRecorder()
		s.routes().ServeHTTP(w, r)
		return w.Code
	}
	if c := post("application/json", `{"name":"Asha","phone":"9876543210","intent":"general"} x`); c != 400 {
		t.Fatalf("trailing data: %d", c)
	}
	if c := post("text/plain", "x"); c != 415 {
		t.Fatalf("ct: %d", c)
	}
	if c := post("application/json", `{}`); c != 429 {
		t.Fatalf("junk must consume limit: %d", c)
	}
	if c := post("application/json", `{"a":1}{"b":2}`); c != 429 {
		t.Fatal(c)
	}
}
