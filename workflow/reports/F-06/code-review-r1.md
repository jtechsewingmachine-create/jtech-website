# Code Reviewer Report — F-06: Support and Locations — Round 1

## Verdict
PASS WITH ISSUES (no Critical or High issues; 2 Low)

## What I checked
- Handoff, blueprint sections (Support and Contact, Locations, "Find an appropriate support route", open finding on map placeholder), root CLAUDE.md content rules, web/CLAUDE.md SEO rules, full staged diff.
- `cd web && npm run verify` (route check, build, render check): passes, 0 errors, 0 warnings.
- Content rules: no invented facts. Unknown terms (warranty, setup, repair, authorised service, contact details, tutorials) all show "Awaiting confirmation" via the shared `AWAITING` constant. Locations are named "Example ...", area says "(fictional)", each card has a "Fictional example" tag, page has a `role="note"` disclosure, `fictional: true` is typed into the model, and the route is `indexable: false` (D-028). No address, phone, distance or authorisation claim. Map placeholder correctly omitted per open finding (D-004).
- SEO rules: both pages registered in `lib/routes.ts` before use, use `seoFor(PATH)`, one h1 carrying the target query, real `next/link` anchors, no client components, no images.
- Decisions D-028 and D-029 are logged for the orphan-warning acceptance, noindex, and the site-wide `.link-arrow` change.
- Intent values match the enquiry page's `intents` handling; footer `/support#contact` exists in `lib/nav.ts`; `#contact` has `tabIndex={-1}` and `scroll-padding-top` accounts for the sticky header.
- Not checked: ran no Playwright suite and no visual review (qa-tester and ui-checker scope).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | Low | `tests/qa/F-01-shell.spec.ts:25-42` | Skip-link test no longer presses Tab. It queries the first focusable DOM element, then calls `.focus()` itself, so it does not prove the skip link is the first real Tab stop. Edit touches a finished feature. | Diff shows `keyboard.press("Tab")` removed. | Acceptable as a flake fix; add a one-line note in the F-06 handoff (already listed there) or restore a real Tab press with a retry. | CLAUDE.md "Don't change code from finished features unless needed" |
| CR-2 | Low | `web/lib/routes.ts` (`/support` row) | `/support` is indexable, but the blueprint's Support discussion says it stays non-indexable for the private prototype because its target query is UNVERIFIED. | Row has no `indexable: false`; the sitemap will include it if the deployment is indexable. | Confirm intent with the owner; `isIndexableDeployment()` likely keeps the whole prototype out of the index anyway. Log in DECISIONS.md or set `indexable: false`. | Blueprint, Support and Contact discussion memory |

## Notes for the Builder
- `globals.css`: the `content: "→" / ""` line follows a plain `content: "→"` fallback, which is the right pattern for older browsers.
- `/locations` lede ("Find where to see a machine, get a repair...") reads as a promise at first glance. It is immediately qualified by "awaiting confirmation" and the fictional notice, so I did not raise it. Consider "Where Jtech sales and service points will be listed" wording if the owner wants it stricter.
- The `tests/qa/F-06-qa.spec.ts` untracked file is the qa-tester's and was not reviewed.
