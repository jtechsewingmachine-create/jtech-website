# Handoff — F-01: Site shell

## Summary
Shared layout for every page: sticky header with logo + 4 nav links, dark footer with 3 link groups and prototype notice, skip link, brand tokens (red/black/white, Red Hat Display), button and arrow-link styles, `.container`/`.section` helpers.

## Docs this implements
- Blueprint §Navigation (`dev_ref/wireframe output/jtech-website-handoff.md`)
- UI ref header + footer (`dev_ref/UI ref/Jtech homepage with red heading accents.png`)
- SEO rules `web/CLAUDE.md` (real anchors, 44px targets)
- Decisions D-010..D-013

## Files changed
- `web/app/layout.tsx` — header, footer, skip link, font
- `web/app/globals.css` — rewritten with brand tokens and shell styles
- `web/components/Logo.tsx` — inline SVG logo (tagline uses currentColor)
- `web/lib/nav.ts` — nav data shared by header + footer
- `web/app/page.tsx`, `web/app/not-found.tsx` — wrapped in `.container section`
- `tests/qa/F-01-shell.spec.ts` — builder tests

## How to run it
`cd web && npm run build && npx next start -p 3101` → http://127.0.0.1:3101/ and any unknown URL (404 page). Tests: `cd web && npx playwright test`.

## Happy flow
1. Open `/` → logo top-left, Machines / Choosing Help / Support / Locations top-right.
2. Press Tab → "Skip to content" appears; Enter → focus on main.
3. Scroll → header stays on top.
4. Footer shows Explore / Help / Business groups and "Private prototype" notice.

## Pages / screens touched (for ui-checker)
- `/` (placeholder content; only judge header/footer) → UI ref header & footer
- `/does-not-exist` (404) → same shell

## API / data changes
None.

## Known limitations
- Nav targets `/machines`, `/support`, `/locations`, `/enquiry` are built in later features, so they 404 for now (expected).
- Homepage body is a placeholder until F-03.

## Where I'd look hardest
- Phone nav row at 320–375px width (fit/scroll).
- Footer logo red on dark (`--logo-red` override) contrast.
- Sticky header + `scroll-padding-top` for `/#choosing-help`.

## After review (round 1 → 2)
- Phone header (≤640px) is static, not sticky (UI-1); nav fits one row down to 320px, no overflow clipping (QA-1, CR-1, CR-2).
- Footer pinned to bottom on short pages (UI-3); header logo red brightened to #b3121d (UI-2); font comment fixed (CR-3, QA-2).
- CR-4 (duplicate logo) kept: `public/logo.svg` is referenced by Organization JSON-LD. Logged in POLISH.md.
