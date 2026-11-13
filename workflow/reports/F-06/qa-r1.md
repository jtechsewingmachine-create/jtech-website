# QA Report — F-06: Support and Locations — Round 1

## Verdict
PASS WITH ISSUES

## What I checked
- Happy flow: five route cards to the correct enquiry intent (product/product/support/support/trade) and the form preselects it; footer Contact to /support#contact; locations CTAs to /enquiry?intent=support; support to locations link.
- Fictional labelling on both entries, no phone/email/distance/"open now"/warranty durations, no lorem/TODO.
- /locations noindex and absent from sitemap; one h1; no horizontal overflow; hostile query string, /locations/extra gives 404.
- #contact not hidden under the sticky header, focusable; unique accessible link names.
- Regression: full suite, both projects. Not covered: real contact data/map (none exist); empty-state of /locations (locations array is static, not reachable without editing code).

Tests: `tests/qa/F-06-qa.spec.ts` (9 tests x 2 projects). Run: `cd web && npx playwright test`
Result: 258 passed, 2 skipped (pre-existing mobile-only keyboard tests), 0 failed.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-1 | Low | `web/lib/routes.ts` /support row | /support is served `index, follow`; the blueprint discussion says Support stays non-indexable in the private prototype until a real target query exists. | `curl localhost:3102/support \| grep robots` gives `index, follow`. Same as the other pages, so likely a project-wide choice. | Confirm intent; set `indexable: false` if the prototype should be unindexed. | Blueprint "Support and Contact discussion" |

## Notes for the Builder
The handoff names `tests/qa/F-06-support-locations.spec.ts`; my tests are in `F-06-qa.spec.ts` alongside it. Server logs show `NoFallbackError` for unknown /machines slugs; these return 404 and are not an F-06 issue.
