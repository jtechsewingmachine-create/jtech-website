# Handoff — F-07: Go enquiry API + Supabase storage

## Summary
The enquiry form now really sends. It posts to `/api/enquiries`, a Next route handler that forwards to the Go API with a shared secret and the visitor IP (D-034). The API checks content type, applies a per-IP rate limit, caps the body size, drops honeypot submissions silently, validates the fields with the same rules as the form, and saves the enquiry to Supabase table `public.enquiries` through the REST API with the secret key. The table is locked to browsers (RLS with no policies, privileges revoked) and rows are deleted after 90 days by pg_cron. The form handles 201, 400 (server field errors shown inline), 429 and other failures, and focus now moves after React commits. The "simulation" wording is replaced by a privacy line and "Enquiry sent".

## Docs this implements
- D-002, D-006, D-030, D-032, D-033; blueprint open finding "A live enquiry implementation lacks privacy and operational dependencies" (minimised data, retention, restricted access, abuse controls)
- Enquiry contract in `web/lib/enquiry.ts`

## Files changed
- `api/main.go` — server, routes, handler, env config (`envInt`)
- `api/enquiry.go` — request/record types, validation mirror, phone normalisation
- `api/store.go` — `Store` interface, Supabase REST store, memory store (dev/tests)
- `api/ratelimit.go` — fixed-window limiter
- `api/main_test.go` — handler, limiter, IP, validation and catalogue-drift tests
- `api/.env.example`, `web/.env.example`
- `supabase/migrations/20261113000000_create_enquiries.sql` (applied to project txcqdsbgejhyfcvamwjm)
- `web/app/api/enquiries/route.ts` — same-origin proxy to `API_ORIGIN` with `X-Proxy-Secret` + `X-Client-IP` (replaced the earlier next.config rewrite)
- `web/lib/enquiry.ts` — `submitEnquiry()`, control-character rule
- `web/components/EnquiryForm.tsx` — real submit, honeypot, rate-limited state, effect-based focus
- `web/components/ConfirmationDetails.tsx`, `web/lib/routes.ts` — live copy
- `web/app/globals.css` — `.hp`
- `web/playwright.config.ts` — starts the Go API (memory store, high rate limit) and builds Next against it
- `tests/qa/F-07-api.spec.ts`; `tests/qa/F-05-enquiry.spec.ts` updated for live copy

## How to run it
- API: `cd api && go run .` (no env = memory store, warns) · `go test ./...`
- Web: `cd web && npm run build && API_ORIGIN=http://127.0.0.1:8080 npx next start` → /enquiry (set `PROXY_SECRET` on both sides to mirror production)
- Everything: `cd web && npx playwright test` (starts both)
- Real storage: set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` on the API (not yet available to the builder).

## Happy flow
1. `/machines/demo-model-2` → "Ask about this machine" → form prefilled.
2. Enter name + number → "Send enquiry" → "Sending…" → `/enquiry/confirmation` "Enquiry sent".
3. API log: `enquiry saved: intent=product` (no personal data).

## API / data changes
- `POST /api/enquiries` JSON `{name, phone, intent, model, message, website}` →
  201 `{"ok":true}` · 400 `{"errors":{field: message}}` or `{"error":"invalid JSON"}` · 413 · 415 · 429 (+Retry-After) · 503.
- Table `public.enquiries(id, created_at, name, phone[10 digits], intent, model, message)`.

## Known limitations
- Real Supabase insert path not exercised end-to-end yet: needs the project's secret key (human). The store is covered by tests through the interface only; DB constraints verified by SQL in a rolled-back transaction.
- Rate limiter is in memory per instance (shortcut comment in code).
- No notification to the business on new enquiries yet (who reads them: open question to owner).
- QA's `tests/qa/F-04-F-05-qa.spec.ts` still asserts the old simulated wording and a NUL character passing through; both changed deliberately.

## Where I'd look hardest
- `clientIP` + `PROXY_SECRET` (X-Client-IP trusted only with the secret; X-Forwarded-For never read).
- Supabase key handling (`Authorization` only for JWT-shaped legacy keys).
- Form state machine after server responses; focus effect.
- Parity between `api/enquiry.go` and `web/lib/enquiry.ts`.

## After review (round 1 → 2)
- CR-1/CR-2/CR-4 + QA-1/QA-2: rewrite replaced by route handler with shared secret (D-034); spoofed XFF can no longer dodge the limit; direct API calls 403 in production.
- CR-3: limiter sweeps once per window, 50k-key cap. CR-5: Unicode-space parity. CR-6: https enforced, body drained, comment fixed.
- QA-3: every request counts toward the limit. QA-4: trailing JSON rejected. QA-5: honeypot name accepted as-is (low value to change).
- CR-8 (deploy): Render must run with `APP_ENV=production` and `PROXY_SECRET`, otherwise the API starts open — covered in F-09 checklist.
- QA-6: route handler reads x-forwarded-for only on Vercel; elsewhere sends no client IP (shared strict bucket). Live check: 4 spoofed XFF → 201 201 429 429; direct API call without secret → 403. QA-7: byte-based size check.
