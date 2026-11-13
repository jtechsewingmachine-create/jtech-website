# QA Tester Report — F-04 + F-05: Machine detail, Enquiry + confirmation — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 3 Low). Happy flow passes on desktop and mobile.

## What I checked
Run: `cd web && npx playwright test` (builds, serves on 3100). Full suite: 230 tests, 221 pass, 7 fail, all 7 are my new bug-proving tests (QA-U1, QA-U2, QA-F1 x2 projects, plus one intermittent QA-D1 case). No regression in F-00..F-03, F-04, F-05 existing specs. New file: `tests/qa/F-04-F-05-qa.spec.ts` (43 tests x 2 projects).
- Happy flow (detail -> CTA -> form -> Sending -> confirmation, no name/phone shown): pass.
- Validation: whitespace-only name, 1/2/80/81-char names, maxLength 100 truncation, Devanagari name, fullwidth/Devanagari digits and bad phones, message 1000/1001, unknown/tampered model and intent (`__proto__`, case, spaces): pass (except issues below).
- Injection/unicode/emoji/RTL/NUL in name and message: inert, no dialogs, nothing reaches confirmation: pass.
- Double click, Enter spam, Enter-to-submit, going offline mid-"Sending", offline failure + values kept + focus + Retry still-offline + Retry online, stale failure banner cleared by validation errors: pass.
- Back/forward/refresh, two tabs with independent context: pass.
- Query tampering (duplicate params, `model[]`, 5000-char, bad percent-encoding, `%00`, `__proto__`, uppercase): no 5xx, ignored safely: pass.
- Tampered sessionStorage (HTML payloads, non-JSON, null, array, wrong types, 100k string): rendered as text, no crash: pass.
- Detail pages: 200, one h1, no heading skips, BreadcrumbList JSON-LD (3 items), CTA href, unavailable note on demo-model-3, 404 for unknown slugs, no stack leakage, confirmation noindex and absent from sitemap: pass.
- Not covered: real backend failure/slowness (simulated, F-07), screen-reader behaviour, visual fidelity (ui-checker's job), `/support` and `/locations` (F-06, 404 expected).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-1 | Medium | `web/components/EnquiryForm.tsx:78` (`<form>` has no `method`/`action`) | Submitting before hydration, or with JS off or failed, does a native GET and puts name, phone and message into the URL (history, server logs, referrers). | Test `QA-F1` (JS disabled). Fill name "Private Person", phone 9876543210, click submit. Result URL: `/enquiry?name=Private+Person&phone=9876543210&intent=&model=&message=`. Expected: personal data never in a URL. | Add `method="post"` (or `action` to a non-GET handler) so no-JS fallback never exposes values; or disable the button until hydrated. | web/CLAUDE.md privacy rules; Blueprint enquiry |
| QA-2 | Low | `web/lib/enquiry.ts` `normalisePhone` | Accepts numbers no Indian line can have: `0000000000`, `1234567890`. Also `+91` followed by `0xxxxxxxxx` is accepted. | Test `QA-U1`: `normalisePhone("0000000000")` returns `"0000000000"`. | Require first digit 6-9 for mobiles (decide landline policy; the unit test accepts "(080) 2345 6789" style, so confirm with owner). Mirror in F-07. | Blueprint pincode/phone findings |
| QA-3 | Low | `web/lib/enquiry.ts` limits | Length is counted in UTF-16 units, so emoji count double. 80 emoji name (80 characters) is rejected with "80 characters or fewer"; a 1000-emoji message is rejected with a count of 2000. Message error text shows an inflated "currently N". | Test `QA-U2`: `validateEnquiry({name:"😀".repeat(80)})` returns a name error. | Count with `[...s].length` (or `Intl.Segmenter`), and keep the Go API consistent (runes). | Handoff contract: message <= 1000 |
| QA-4 | Low | `/machines/[slug]` static serving | Intermittent and order-dependent: after the real URL was requested, `/machines/Stylish-Stitcher` returned 200 (otherwise 404). Reproduced with curl on macOS: `curl /machines/Stylish-Stitcher` -> 404, then `curl /machines/stylish-stitcher`, then the case variant -> 200. Possible duplicate content under a case variant. Likely platform/FS dependent (macOS), unconfirmed on Linux. | Tests `QA-D1` and `unknown slug /machines/Stylish-Stitcher` (fails in some runs, passes in others). | Verify on the deploy OS; if it reproduces, add a case-normalising redirect/404 or a canonical tag on the variant. | web/CLAUDE.md SEO rules (one URL per page) |

## Fixed since last round (Round 2+ only)
n/a (Round 1).

## Notes for the Builder
- The failing tests are kept as proof (not skipped); they will go green when fixed. QA-2 depends on the owner's phone policy, so decide before changing the test.
- Confirmation context stays in sessionStorage after viewing, so a later visit to `/enquiry/confirmation` in the same tab shows a stale confirmation. Acceptable for a prototype; clear it on read if you want stricter behaviour.
- Error-summary role=alert plus Next's route announcer both exist; my locators use `.error-summary` to avoid strict-mode clashes.
- Test-only note: `/machines/%2e%2e` is normalised by the client to `/` (200), not an app bug, so I dropped it.
