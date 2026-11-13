# Code Reviewer Report — F-07: Go enquiry API + Supabase storage — Round 2

## Verdict
PASS (0 Critical, 0 High, 0 Medium; 2 Low, non-blocking).

## What I checked
- r1 report + builder response, D-034, staged diff of api/main.go, ratelimit.go, store.go, enquiry.go, web/app/api/enquiries/route.ts, env examples, handoff.
- `cd api && go vet main.go enquiry.go store.go ratelimit.go` clean; `go test -count=1 main.go enquiry.go store.go ratelimit.go main_test.go` pass; gofmt clean. `cd web && npx tsc --noEmit` clean.
- NOT run: qa_test.go (QA updating), Playwright, npm run build, live Supabase insert, real Vercel/Render header behaviour.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-7 | Low | `workflow/handoff/F-07-enquiry-api.md:18,49` | Handoff still describes the next.config rewrite and `TRUST_PROXY`; both are gone (D-034). | grep | Update handoff to route handler, PROXY_SECRET, X-Client-IP. | D-034 |
| CR-8 | Low | `web/app/api/enquiries/route.ts:23`, `api/main.go:112` | `body.length` counts UTF-16 units, not bytes (Go's 8 KiB MaxBytesReader is the real bound, so harmless). Separately, if the host runs without `APP_ENV=production` and without `PROXY_SECRET`, the API is open and all visitors share the proxy's peer-IP bucket. Config-only risk. | Read code | Optional: note in deploy docs that APP_ENV=production must be set on Render. | D-034 |

## Fixed since last round
- CR-1 fixed: XFF is never read; IP comes from `X-Client-IP` only with a constant-time-verified `X-Proxy-Secret`; production API returns 403 without it (`TestClientIPNeverTrustsForwardedFor`, `TestProxySecretRequiredWhenConfigured`). Spoofed leading XFF test present.
- CR-2 fixed: Next route supplies the real visitor IP, so no shared bucket; API refuses to start in production without PROXY_SECRET. Next route's `x-forwarded-for` first-entry use is documented as Vercel-specific (shortcut comment).
- CR-3 fixed: IPs are `net.ParseIP`-normalised, sweep at most once per window, 50k key cap (fail-open reset, documented shortcut).
- CR-4 fixed: rewrite removed; missing API_ORIGIN returns logged 503 at runtime (acceptable; not a build error but visible in logs).
- CR-5 fixed: Go uses `unicode.IsSpace`; `TestPhoneAcceptsUnicodeSpaces`.
- CR-6 fixed: https enforced for SUPABASE_URL, body drained, comment corrected (verified main.go/store.go/enquiry.go).
- New in D-034: trailing-JSON rejected (`dec.More()`), every request counts toward the limit. Both correct. Rate-limit-before-content-type ordering is intentional.

## Notes for the Builder
- Route handler correctly strips cookies/other headers (only content-type, IP, secret forwarded), 8s timeout, passes Retry-After, no internals leaked.
- If PROXY_SECRET is unset on Vercel but set on Render, every enquiry gets 403 shown as a generic failure; set both together.
