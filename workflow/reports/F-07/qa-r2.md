# QA Tester Report — F-07: Go enquiry API + Supabase storage — Round 2

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 1 Low)

## What I checked
- `cd api && go vet ./... && go test -count=1 ./...`: pass. `api/qa_test.go` rewritten for the PROXY_SECRET design (spoofed X-Forwarded-For / X-Client-IP with and without the secret, wrong/empty/near-miss secrets -> 403, 403s do not consume limit, unparseable / whitespace / v4-mapped IPs, trailing data and 415 count toward the limit).
- Full `cd web && npx playwright test`: 354 passed, 2 skipped, 0 failed (desktop + mobile). `tests/qa/F-07-qa-api.spec.ts` now sends the secret on direct calls, asserts trailing garbage -> 400, and adds a direct-without-secret 403 test (incl. forged X-Client-IP / X-Forwarded-For).
- Live check through the real Next route (own API :8093 RATE_LIMIT=2 PROXY_SECRET, `next start` :3101): plain requests 201,201,429; forged `X-Client-IP` from the browser side is overwritten by the route (429,429,429); oversized body -> 413.
- Not covered: real Supabase insert, pg_cron, Vercel's actual header behaviour, CR-1..CR-6 beyond what overlaps (I did not re-read the code review file item by item).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-6 | Medium (only off Vercel) | `web/app/api/enquiries/route.ts` `visitorIp` | The route trusts the first entry of the incoming `X-Forwarded-For`. Anywhere the host does not overwrite that header (e.g. `next start`, Render, a VPS), a visitor can set it per request and get a fresh rate-limit bucket each time. This is QA-1 moved one hop up; the code comment (shortcut) acknowledges it. | Live: `X-Forwarded-For: 10.1.1.N` x4 through :3101 with RATE_LIMIT=2 -> `201 201 201 201`; without spoof -> `201 201 429`. | Use the platform-guaranteed header only (`x-vercel-forwarded-for` / `x-real-ip` on Vercel), or take the right-most XFF entry; fail closed (reject or shared bucket) when the header is absent. Document the deploy requirement in `web/.env.example`. | D-034, D-033 |
| QA-7 | Low | route.ts `MAX_BODY` | Size check uses `body.length` (UTF-16 units), not bytes; a ~16 KiB multibyte body passes the route and is then rejected by Go (413), so no bypass, just an inconsistent cap. Also the whole body is read before the check. | n/a (reasoned from code) | Check `Content-Length` first / `Buffer.byteLength`. | |

## Fixed since last round
- QA-1 (left-most XFF trusted by Go): Verified fixed in Go. XFF is never read; X-Client-IP only with the valid secret and must parse as an IP. Residual exposure moved to the Next route: see QA-6.
- QA-2 (all visitors share one IP behind proxy): Verified fixed at the Go level (X-Client-IP per visitor). Depends on QA-6 being resolved for the real host.
- QA-3 (415 before limiter): Verified fixed (415 and trailing-data requests now consume the limit; 403s do not).
- QA-4 (trailing data accepted): Verified fixed (400).
- QA-5: informational, no action required.
- CR-1..CR-6: not independently re-verified, except behaviour overlapping the above (secret, 403, XFF, limiter order, trailing data).

## Notes for the Builder
- Unicode-whitespace phone separators: no new break found by the API spec (fullwidth digits are still rejected).
- `NoFallbackError` for an unknown machine slug still appears in the web server log; tests pass (pre-existing noise).
- Run: `cd web && npx playwright test` and `cd api && go test ./...`.


## Builder response
- QA-6: fixed — route handler reads x-forwarded-for only when `VERCEL` is set (Vercel overwrites it); elsewhere it sends no client IP, so the API uses one shared bucket (fails closed, not open). Documented in `web/.env.example`.
- QA-7: fixed — size check counts UTF-8 bytes.
