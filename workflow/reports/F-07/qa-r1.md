# QA Tester Report — F-07: Go enquiry API + Supabase storage — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 2 Medium, 3 Low)

## What I checked
- Happy flow end to end (form -> Next proxy -> Go API -> confirmation) and the full Playwright suite: 350 passed, 2 skipped, 0 failed (desktop + mobile). `go vet` and `cd api && go test -count=1 ./...` pass (includes my `api/qa_test.go`).
- Updated `tests/qa/F-04-F-05-qa.spec.ts`: new copy ("could not be sent"); NUL removed from the injection-inert test and a new test asserts control characters are rejected inline with zero POSTs; offline-recovery uses a retried Retry click (`toPass`); "offline during Sending" now holds the request in flight via `page.route` (the real API answers in ms, so the old test raced the response). No privacy/honesty assertion weakened.
- New `tests/qa/F-07-qa-api.spec.ts`, run against both proxy (:3100) and direct (:8090): methods (GET/PUT/DELETE/PATCH -> 404/405), content types (415), charset param, malformed/empty/non-object JSON (400, no stack leaks), type confusion (numbers/arrays/objects/bool -> 400), nulls, unknown fields and `__proto__`, 8 KiB cap (413), rune-based length limits (emoji x1000/1001), name boundaries, control chars/bidi/zero-width/lone surrogate, phone variants incl. fullwidth digits, intent/model whitelists, injection strings, honeypot, error content-type, healthz/404.
- Live rate limit and X-Forwarded-For with my own APIs (RATE_LIMIT=2): without TRUST_PROXY, spoofed XFF is ignored (201,201,429,429). With TRUST_PROXY=1, each distinct XFF got its own bucket (4x 201). Also covered in Go tests.
- Not covered: real Supabase insert path (no secret key), pg_cron retention, key handling for JWT vs new-style keys, real proxy header behaviour on Vercel/Render.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-1 | Medium | `api/main.go` `clientIP` | With `TRUST_PROXY=1` the left-most X-Forwarded-For entry is used, which is client-controlled (proxies append, they don't replace). Rate limit is fully bypassable. | `PORT=8092 RATE_LIMIT=2 TRUST_PROXY=1 go run .`; 4 POSTs with `X-Forwarded-For: 10.0.0.N` -> `201 201 201 201`. Without TRUST_PROXY -> `201 201 429 429`. | Use the right-most entry (or the Nth from the right matching the known proxy hop count), or the platform's own header (e.g. `X-Real-IP`/`CF-Connecting-IP`). | Handoff "look hardest" |
| QA-2 | Medium | `api/main.go` + `web/next.config.ts` | Deployment trap: the API sits behind the Next rewrite, so with TRUST_PROXY unset every visitor shares the Next server's IP and the whole site gets 5 enquiries/10 min total; setting TRUST_PROXY=1 triggers QA-1. No documented safe config. (Reasoned from code and the two live runs above; not tested on real hosting.) | See QA-1 runs: without TRUST_PROXY the key is the socket peer only. | Fix QA-1 (right-most/hop-count XFF) and document the required setting in `api/.env.example`. | D-033 abuse controls |
| QA-3 | Low | `api/main.go:createEnquiry` | 415 is returned before the rate limiter, so junk requests are unlimited (cheap, body not read; low impact). Rejected 400/413 requests do count toward the limit, so a typo-prone user burns attempts (limit 5 per 10 min). | 5x `Content-Type: text/plain` POSTs all 415 after the limit was hit. | Accept, or limit before content-type check; consider counting only 201s. | |
| QA-4 | Low | `api/main.go` decode | Trailing data after a valid JSON object (`{...} garbage`) is accepted (single `Decode`, no EOF check). | `curl -d '{"name":..} garbage'` was processed (hit the limiter, not rejected as JSON). Harmless, but a stricter parser is cleaner. | Check `dec.More()`/second Decode returns `io.EOF`. | |
| QA-5 | Low | `api/main.go` honeypot | Honeypot check runs before validation and the limiter has already counted it; a bot sending `website` gets a fake 201 regardless of content (intended). Note a value of only whitespace is not treated as a trap (intended). Informational: field name `website` is guessable; consider a less obvious name. | `{"website":"x"}` -> 201 `{"ok":true}`. | None required. | |

## Fixed since last round (Round 2+ only)
N/A (Round 1).

## Notes for the Builder
- My old simulated-wording and NUL expectations were updated as you flagged; both behaviours confirmed (NUL -> 400 from API, blocked client-side with no request).
- Phone `091-...` is rightly rejected (prefix is `91` or `0`, not both); my first draft assumed otherwise and I corrected the test.
- Run: `cd web && npx playwright test` (new files: `tests/qa/F-07-qa-api.spec.ts`, `api/qa_test.go`). Result 350 passed / 2 skipped. A `NoFallbackError` line appears in webserver logs for an unknown machine slug; tests pass, pre-existing noise.
