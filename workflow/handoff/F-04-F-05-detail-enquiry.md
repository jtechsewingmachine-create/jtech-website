# Handoff — F-04: Machine detail pages, and F-05: Enquiry + confirmation

## Summary
Each demo model has a statically generated page at `/machines/<slug>` (unknown slugs 404). The page has a breadcrumb, a summary with package options and a primary "Ask about this machine" action near the top, a photo gallery, suitability and specifications, support and learning, and other models. The action opens `/enquiry?model=<slug>` with the machine preselected. The enquiry form validates, shows submitting, failure (with values kept + Retry) and success states. Submission is simulated in the browser. Success leads to `/enquiry/confirmation`, which shows only the enquiry type and machine, or a missing-context state.

## Docs this implements
- Blueprint §Representative Machine Detail, §Product and Contact Enquiry, §Enquiry Confirmation, flows "Discover a suitable machine and submit an enquiry", "Submit a trade-interest enquiry"; open findings on fragmentation, acknowledgement checkbox, pincode, breadcrumb semantics, context handoff
- `web/CLAUDE.md` rules 1, 2, 3, 7, 8
- Decisions D-003, D-004, D-021..D-024

## Files changed
- `web/app/machines/[slug]/page.tsx` — detail page (static params, dynamicParams=false, breadcrumb JSON-LD)
- `web/lib/routes.ts` — 3 detail rows (+ `breadcrumb` field), `/enquiry` and `/enquiry/confirmation` rows (indexable: false)
- `web/lib/seo.ts` — breadcrumb names use `route.breadcrumb`
- `web/lib/enquiry.ts` — intents, validation, phone normalisation, confirmation context type
- `web/components/EnquiryForm.tsx` — client form (states, focus management, simulated submit)
- `web/components/ConfirmationDetails.tsx` — client leaf reading sessionStorage
- `web/app/enquiry/page.tsx`, `web/app/enquiry/confirmation/page.tsx`
- `web/app/globals.css` — detail + form styles
- `tests/qa/F-04-detail.spec.ts`, `tests/qa/F-05-enquiry.spec.ts`; `tests/qa/package.json` no longer `"type": "module"` (needed to import `web/lib/enquiry.ts` in unit tests)

## How to run it
`cd web && npm run build && npx next start -p 3101` → http://127.0.0.1:3101/machines/stylish-stitcher, /machines/demo-model-2, /machines/demo-model-3, /enquiry, /enquiry?intent=trade, /enquiry/confirmation. Tests: `cd web && npx playwright test`.

## Happy flow
1. `/machines/demo-model-2` → breadcrumb Home / Machines / Demo model 2; two package options with contents and labelled sample prices; "Ask about this machine".
2. Click it → `/enquiry?model=demo-model-2`; help type = Machine enquiry, machine = Demo model 2; summary names the machine.
3. Submit empty → error summary gets focus; each field shows its error in text; typed values stay.
4. Fill name, number (e.g. 98765 43210) → Submit → button shows "Sending…" → `/enquiry/confirmation` with "Machine enquiry" and "Demo model 2". Says nothing was sent and no order was placed.
5. Go offline and submit → "could not be completed", values kept, Retry and Contact support.
6. Open `/enquiry/confirmation` directly → "No confirmation details are available." with Return to enquiry / Browse machines.
7. `/machines/demo-model-3` → "Currently unavailable" note; action reads "Ask about availability".

## Pages / screens touched (for ui-checker)
- `/machines/[slug]` (3 pages) → blueprint Representative Machine Detail (no image wireframe; match UI ref style)
- `/enquiry`, `/enquiry/confirmation` → blueprint Enquiry screens; UI ref style

## API / data changes
`web/lib/enquiry.ts` defines the enquiry contract: `{ name, phone, intent: general|product|support|trade, model: slug|"", message ≤ 1000 }`. F-07 (Go API) must mirror these rules.

## Known limitations
- Submission is simulated; F-07 adds the Go API.
- `/support` and `/locations` links 404 until F-06.
- Pincode and the acknowledgement checkbox are intentionally absent (D-004, blueprint open findings).
- Error-summary links jump to the field id but don't move focus into the input (browser default).
- Next logs `NoFallbackError` in the server console for unknown slugs; the response is a correct 404.

## Where I'd look hardest
- `EnquiryForm` state machine: double submit, Retry, values after failure, focus moves.
- Query-param handling on `/enquiry` (untrusted input).
- Honesty of detail page copy.
- Heading order on detail (h1 → h2 "What comes with the machine?" inside the summary, then section h2s).

## After review (round 1 → 2)
- QA-1: form `method="post"`, submit disabled until hydrated, <noscript> note — no personal data can reach the URL.
- QA-2: phone must start 2–9 (D-027). QA-3: limits count code points. QA-4: uppercase paths 301 to lowercase (`web/middleware.ts`, D-026).
- CR-1: targetQuery aligned to h1s (D-025). CR-2: button stays focusable while sending. CR-3 + QA-5: confirmation context read once per visit (per-instance ref) and cleared.
- UI-1: neutral confirmation h1. UI-3/UI-4 fixed; UI-2 intentional (D-004); UI-5 → POLISH.md.
