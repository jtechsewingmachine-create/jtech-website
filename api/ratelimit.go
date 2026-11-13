package main

import (
	"sync"
	"time"
)

// rateLimiter allows `limit` requests per key per `window` (fixed window).
// shortcut: in-memory, so limits reset on restart and are per instance; use a shared store if the API scales out.
type rateLimiter struct {
	mu        sync.Mutex
	limit     int
	window    time.Duration
	hits      map[string]*bucket
	lastSweep time.Time
	now       func() time.Time
}

// maxKeys bounds memory. Keys are proxy-verified IPs, so reaching this means a very large crowd.
const maxKeys = 50_000

type bucket struct {
	start time.Time
	count int
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{limit: limit, window: window, hits: map[string]*bucket{}, now: time.Now}
}

// allow records a hit and reports whether it is within the limit, plus seconds until the window resets.
func (r *rateLimiter) allow(key string) (bool, int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := r.now()
	if now.Sub(r.lastSweep) >= r.window { // drop expired buckets at most once per window
		r.lastSweep = now
		for k, b := range r.hits {
			if now.Sub(b.start) >= r.window {
				delete(r.hits, k)
			}
		}
	}
	if len(r.hits) >= maxKeys && r.hits[key] == nil {
		r.hits = map[string]*bucket{} // shortcut: fail open rather than grow without bound
	}
	b := r.hits[key]
	if b == nil || now.Sub(b.start) >= r.window {
		b = &bucket{start: now}
		r.hits[key] = b
	}
	b.count++
	retry := int(r.window.Seconds() - now.Sub(b.start).Seconds())
	return b.count <= r.limit, max(retry, 1)
}
