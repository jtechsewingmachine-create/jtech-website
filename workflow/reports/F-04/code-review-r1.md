# Code Reviewer Report — F-04 + F-05: Machine detail, Enquiry + confirmation — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 2 Low)

## What I checked
- Read the handoff, `web/CLAUDE.md`, root `CLAUDE.md` content rules, the blueprint sections (Machine Detail, Enquiry, Confirmation, open findings) and DECISIONS D-021..D-024.
- Full staged diff: detail page, enquiry lib/form/pages, confirmation, routes/seo changes, CSS (skimmed), tests.
- Ran: `npm run check:routes` (0 errors), `npm run verify` (routes + build + render checks pass), `tsc --noEmit` (clean), `npx playwright test` (142 passed, 2 skipped).
- Not run: ESLint. The project has no `eslint.config.*`, so no linter exists to run. No visual or UX check (ui-checker's job).
- Design conformity: deviations (select instead of "Change machine", no pincode, no acknowledgement checkbox, noindex, no Product schema, dynamic /enquiry) are either logged (D-021..D-023) or follow the blueprint's open findings. Breadcrumb is a labelled nav with a non-linked current page. Unknown slugs 404 (`dynamicParams=false`). Server rendering, `next/link`, `Img` via `ProductMedia`, schema limited to visible breadcrumb: all OK.
- Content honesty: unknown facts render "Awaiting confirmation"; sample prices labelled; demo tags present; no invented warranty, reviews or response times. No violations found.
- Security: query params are whitelisted (`productBySlug`, `isIntent`) and rendered through React escaping; the JSON-LD payload is static data; confirmation context holds no name or number; sessionStorage read is parsed and type-checked. OK.
- Form state machine: double-submit guard, retry, values kept on failure, error and failure focus moves all hold up in the code and tests.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | Medium | `web/app/machines/[slug]/page.tsx:69-71`, `web/app/enquiry/page.tsx:25-27`, `web/app/enquiry/confirmation/page.tsx:15-17`, `web/lib/routes.ts` (new rows) | The h1 does not carry the page's `targetQuery`. Examples: demo-model-2 query "jtech traditional sewing machine with table" vs h1 "Jtech Demo model 2"; stylish-stitcher query "...sewing machine" vs h1 "Jtech Stylish Stitcher"; enquiry "contact jtech sewing machines" vs "Contact Jtech"; confirmation "jtech enquiry confirmation" vs "Simulation complete". Not logged (D-020 handled this for the home page only). The gates did not catch it. | Compare each route's `targetQuery` with the rendered h1. | Either change the h1 so it contains the query (e.g. "Jtech Demo model 2 traditional sewing machine with table"), or change `targetQuery` to what the h1 says, or log a decision that rule 3 is relaxed for noindex prototype pages. | `web/CLAUDE.md` rule 3 |
| CR-2 | Low | `web/components/EnquiryForm.tsx:216` | The submit button is `disabled` while submitting. A keyboard user who pressed it loses focus to `<body>` for ~600 ms, and `aria-disabled` is redundant next to `disabled`. | Tab to Submit, press Enter: focus is dropped. | Keep the button focusable: drop `disabled` and keep `aria-disabled` plus the existing `status === "submitting"` guard in `onSubmit`. | WCAG 2.4.3 (general) |
| CR-3 | Low | `web/components/ConfirmationDetails.tsx:10-23`, `web/components/EnquiryForm.tsx:72` | The sessionStorage context is never cleared. Reloading `/enquiry/confirmation`, or opening it later in the same tab, shows the old success state instead of the missing-context state. | Submit, go back to `/enquiry/confirmation` again after a new tab session visit: stale "Machine enquiry" appears. | `removeItem` after reading in the effect (note: React strict mode runs the effect twice in dev only), or accept and note it. | Blueprint finding "missing_confirmation_context" |

## Notes for the Builder
- `Intent` type and `EnquiryInput.intent: string` are loosely typed on purpose (select can hold ""); fine.
- Known limitations in the handoff (`/support` and `/locations` 404 until F-06, error-summary link focus, `NoFallbackError` log) are accepted.
- Removing `"type": "module"` from `tests/qa/package.json` is documented and all older specs still pass.
- `aria-current="page"` sits on the `<li>`; putting it on a `<span>` inside the item is the more common pattern, but this is taste.
- When F-07 lands, mirror `validateEnquiry` and `normalisePhone` in Go and add a test of agreement, as the handoff says.

## Builder response
- CR-1: fixed by aligning targetQuery to the visible h1 on all 5 routes (D-025).
- CR-2: fixed — button is no longer `disabled` while submitting; `aria-disabled` + guard.
- CR-3: fixed — context is read once and removed from sessionStorage.
