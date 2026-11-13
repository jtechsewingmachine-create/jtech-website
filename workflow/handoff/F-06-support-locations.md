# Handoff — F-06: Support and Locations

## Summary
`/support` separates five help routes (buying, demonstrations, general repairs, warranty service, trade), each linking to the enquiry form with the right intent. It shows the unconfirmed support terms as "Awaiting confirmation", has a contact block (`#contact`, target of the footer "Contact" link), and links to learning resources and locations. `/locations` lists two clearly fictional example locations with their service types and an "Ask about service near me" action, plus an empty state. It is noindex.

## Docs this implements
- Blueprint §Support and Contact, §Locations, flow "Find an appropriate support route"; open findings (no map placeholder, D-004)
- Decisions D-013, D-028, D-029

## Files changed
- `web/app/support/page.tsx`, `web/app/locations/page.tsx`, `web/lib/locations.ts`
- `web/lib/routes.ts` — two rows
- `web/app/globals.css` — route/location grids; `.link-arrow::after` alt text (site-wide)
- `web/components/ProductCard.tsx` — hidden link suffix reads "for <name>"
- `tests/qa/F-06-support-locations.spec.ts`; `tests/qa/F-01-shell.spec.ts` skip-link test made deterministic

## How to run it
`cd web && npm run build && npx next start -p 3101` → /support, /support#contact, /locations. Tests: `cd web && npx playwright test`.

## Happy flow
1. `/support` → five route cards → "Contact about this" on General repairs → `/enquiry?intent=support` with Support enquiry preselected.
2. Footer "Contact" on any page → `/support#contact`.
3. `/locations` → fictional notice, two example cards labelled "Fictional example", each → `/enquiry?intent=support`.

## Pages / screens touched (for ui-checker)
- `/support` → blueprint Support and Contact; UI ref style
- `/locations` → blueprint Locations; UI ref style

## API / data changes
`web/lib/locations.ts` — `Location { id, name, area, services[], fictional: true }`.

## Known limitations
- Demonstration and Buying both map to the "Machine enquiry" intent (the form has four intents).
- Real contact phone/email/hours unknown, so the contact block points to the form.

## Where I'd look hardest
- Anything that could read as a real location, address or service promise.
- `#contact` focus/scroll under the sticky header.

## After review (round 1)
- All findings Low. UI-2 fixed (gap under location cards). CR-2/QA-1: /support indexable by design — the prototype is kept out of search at deployment level (D-005). CR-1: tab order still covered by `F-01-qa.spec.ts` keyboard test. UI-1/UI-4 → POLISH.md. UI-3 intentional (D-004).
