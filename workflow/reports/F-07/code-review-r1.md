# Code Reviewer Report — F-07: Go enquiry API + Supabase storage — Round 1

## Verdict
FAIL (1 High: rate limiter keyed on a client-controlled value).

## What I checked
- Handoff, DECISIONS D-032/D-033, full staged diff (api/, web/, supabase migration, configs).
- Validation parity api/enquiry.go vs web/lib/enquiry.ts; migration; key handling; PII in logs; rate limit and XFF; body limits; error leakage; Next rewrite; form state machine.
- `cd api && go vet ./... && go test -count=1 ./...` pass, gofmt clean. `cd web && npm run verify` passes (build, check-render 0 errors).
- NOT checked: Playwright (QA), real Supabase insert (no key), actual Vercel/Render XFF behaviour (from docs knowledge only).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | High | `api/main.go` clientIP (~L40-50) | With TRUST_PROXY=1 the rate-limit key is the LEFT-most X-Forwarded-For entry, which is whatever the caller sent. Proxies (Render, Vercel) append to the header, so an attacker sets `X-Forwarded-For: <random>` per request and never hits the 5/10min limit. The Render API URL is also directly reachable, bypassing Next. The limiter is the only abuse control besides the honeypot, so the DB can be flooded with junk PII rows. | `curl -H 'X-Forwarded-For: 1.2.3.N' ...` with N varying: each gets its own bucket. | Use the entry N hops from the right (N = number of trusted proxies, env `TRUST_PROXY_HOPS`), or the platform's trusted header; take the right-most untrusted. Add a test with a spoofed leading entry. Optionally require a shared secret header from the Next rewrite so only Next can call the API. | D-032 |
| CR-2 | Medium | `api/main.go` main(), `api/.env.example` | Traffic reaches the API via the Next rewrite, so the socket peer is the Next server. If TRUST_PROXY is unset (the default), every visitor shares one bucket: 5 enquiries per 10 min site-wide, a trivial denial of service for real customers. Safe only if deployment sets the exact right hop count; nothing documents the Vercel -> Render chain. | Reading `clientIP`: no TRUST_PROXY gives RemoteAddr only. | Fix together with CR-1 (hop count). Document the chain in the handoff/deploy notes. Log a startup warning when APP_ENV=production and trust is off. | D-032 |
| CR-3 | Medium | `api/ratelimit.go:33-40` | Bucket keys are attacker-controlled and unbounded in count and length (XFF header up to the server header limit, default 1 MB). Cleanup only evicts expired buckets and runs a full O(n) scan under the mutex on every request once >10k buckets exist, so a flood of unexpired keys gives memory growth and CPU burn on every request. | Send >10k distinct XFF values inside the window. | Hard-cap map size (reject or evict oldest when full), validate the key with `net.ParseIP` (falls back to the peer address if invalid), and sweep at most every window rather than per request. | D-032 |
| CR-4 | Low | `web/next.config.ts:61-66` | `API_ORIGIN` is build-time only and optional: if unset on the production build, the rewrite silently disappears and every enquiry returns a Next 404, shown to users as "could not be sent", with no build or startup signal. | Build with API_ORIGIN unset. | Throw at build when `SITE_ENV=production` and API_ORIGIN is missing (or validate it parses as http(s) URL). | D-032 |
| CR-5 | Low | `api/enquiry.go:24` vs `web/lib/enquiry.ts:36` | Phone separator parity: TS strips `\s` (incl. NBSP, newlines, U+2028), Go strips only space and tab. Input like `98765 43210` passes the form but gets a 400 from the API (shown inline, so not data loss). Also Go `TrimSpace` vs JS `trim` differ on U+0085/U+FEFF, and Go measures message length after trimming trailing whitespace while TS measures raw (safe direction). | Submit NBSP-separated number via API directly. | Strip the same set on both sides (`unicode.IsSpace` in Go) and add a parity test case. | web/lib/enquiry.ts header ("keep both in sync") |
| CR-6 | Low | `api/enquiry.go:11`, `api/store.go:46` | Stale/loose bits: comment cites `enquiry_test.go` (tests live in `main_test.go`); `SUPABASE_URL` is not checked to be https (the secret key would go over plain http if mistyped); response body is closed but not drained (minor connection reuse). | Read comment and `newSupabaseStore`. | Fix comment; reject non-https SUPABASE_URL unless host is localhost. | — |

## Fixed since last round (Round 2+ only)
N/A (Round 1).

## Notes for the Builder
Good and verified by reading:
- Logs contain no PII (only intent and error status; the Supabase error path logs status code, not body or key).
- Client sees generic messages only (503 "could not be saved"); no internals leaked.
- 8 KiB MaxBytesReader, JSON content-type check, 413/415/429 codes, Retry-After, `Cache-Control: no-store` all correct. A max valid enquiry (1000 chars x 3 bytes + fields) is well under 8 KiB.
- NUL/control characters rejected in both layers, so Postgres NUL errors cannot occur. Name/message/intent/model/phone rules and wording match the web; DB CHECKs match the API.
- Migration is sound: RLS on, no policies, privileges revoked from anon/authenticated (service_role keeps default grants), index on created_at, 90-day pg_cron retention. Retention is also stated on the form.
- Key handling: key only in env, only sent server-side, `.env*` gitignored with only examples tracked; legacy JWT vs `sb_secret_` handling is reasonable. The real insert path remains unverified until the key exists; run one live insert before launch.
- Form: double-submit guard, honeypot hidden with aria-hidden/tabIndex -1, focus via effect, 400 mapping to inline errors are all correct. Retry after a network failure after a successful save could create a duplicate row (acceptable; mention in ops notes).
- The rewrite forwards cookies and all headers to the API; harmless today, but if you add the shared-secret header from CR-1, set it in the rewrite or move to a route handler.

## Builder response
- CR-1/CR-2/CR-4 fixed by D-034 (route handler + shared secret; XFF never trusted; missing API_ORIGIN → logged 503).
- CR-3: sweep once per window, hard cap 50k keys (fail open, shortcut comment); keys are now proxy-verified IPs.
- CR-5: Go strips Unicode whitespace like JS `\s` (NBSP test added). CR-6: comment fixed, https enforced for SUPABASE_URL, response body drained.
