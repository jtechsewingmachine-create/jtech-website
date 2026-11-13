# QA Tester Report — F-04 + F-05: Machine detail, Enquiry + confirmation — Round 2

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium new, 0 Low). QA-1..QA-4 verified fixed.

## What I checked
Run: `cd web && npx playwright test`. Final full suite: 228 tests, 226 pass, 2 fail (both are the new QA-R2-1 proof test, desktop + mobile). F-01 shell skip-link test failed once in one run and passed in two others (flaky, see notes).
Tests updated only where expectations conflict with the deliberate changes: JS-off test now asserts the submit button is disabled and nothing reaches the URL; case-variant test now asserts 301 + Location (incl. query string kept, uppercase 404 slug also 301); back/forward test now expects reload of confirmation to show the missing-context state; happy flow asserts the new h1 "Your Jtech enquiry". No privacy/honesty check weakened. Unit tests for phone (leading 0-1 rejected) and emoji counting (code points) now pass unchanged.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-5 | Medium | `web/components/ConfirmationDetails.tsx` (module-level `cached`) | In one tab, a second enquiry made via client-side navigation shows the FIRST enquiry's type and machine on the confirmation page (wrong data). | Test `QA-R2-1`. Submit Machine enquiry for Demo model 2 -> confirmation -> "Continue browsing" -> click a link to `/enquiry?intent=trade` -> submit a Trade enquiry. Expected "Trade enquiry"; actual page shows "Machine enquiry / Demo model 2" (snapshot in test-results). Cause: `cached` persists across SPA navigations, so the new sessionStorage value is never read. | Reset `cached` on unmount (effect cleanup), or key the read to a per-submit id, instead of a module-level cache; keep StrictMode safety via a ref. | Blueprint Enquiry Confirmation (shows the enquiry just made) |

## Fixed since last round (Round 2+ only)
- QA-1 (PII in URL without JS): Verified fixed. Button disabled with JS off, Enter does nothing, URL clean.
- QA-2 (phone leading digits): Verified fixed (0000000000 and 1234567890 rejected; +91/91/0 prefixes still accepted).
- QA-3 (emoji counted twice): Verified fixed (80-emoji name and 1000-emoji message accepted).
- QA-4 (case variant 200): Verified fixed; 301 to lowercase with query preserved, before and after the real page is requested.

## Notes for the Builder
- Back/forward within the SPA: forward to confirmation still shows success (module cache), only a hard reload shows missing-context. Probably acceptable, but it is the same cache that causes QA-5.
- Flaky: `F-01-shell.spec.ts:25 skip link is first tab stop` failed once (desktop) in one of three full runs, with toBeFocused failing. Not reproduced twice. Possibly timing with the new hydration-gated form or tab focus; worth a look if it recurs.
