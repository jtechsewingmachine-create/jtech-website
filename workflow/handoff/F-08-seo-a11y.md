# Handoff — F-08: SEO + accessibility hardening

## Summary
Added an automated accessibility audit (axe-core on all 10 routes plus form error and success states, heading order, reduced motion, tap targets) and SEO checks (sitemap contents, OG image, icons, raster Organization logo). Added a WebKit (Safari) test project. Fixes found by these:
1. **Safari hid the hero image completely.** Lightning CSS mis-prefixes `mask-composite: intersect` as a `-webkit-mask-composite` list. The fix splits the two gradient masks across the figure wrapper and the image, and a regression test guards it.
2. **Safari rendered selects 26px tall.** Custom `appearance: none` selects with a chevron restore the 48px target.
3. **Pausing during video start-up showed "could not play".** An `AbortError` from `play()` is now ignored.
4. **The social card, raster logo and favicon were missing** and have been created.

## Docs this implements
- `web/CLAUDE.md` (rules 1, 3, 5, 8), starter README (OG defaults); blueprint open findings: heading semantics, focus/contrast/target size evidence, reduced-motion verification, cinematic media alternatives
- Decisions D-035, D-036

## Files changed
- `tests/qa/F-08-a11y-seo.spec.ts` — new audit spec
- `web/playwright.config.ts` — webkit project (grepInvert + retries documented)
- `web/package.json` — dev dependency `@axe-core/playwright@4.10.2`
- `web/app/globals.css` — hero masks split; custom select
- `web/app/page.tsx` — `.hero__frame` wrapper
- `web/components/DemoVideo.tsx` — ignore AbortError
- `web/lib/site.config.ts` — Organization logo → `/logo.png`
- `web/public/og.png`, `web/public/logo.png`, `web/app/icon.svg`, `web/app/apple-icon.png`

## How to run it
`cd web && npx playwright test` (desktop, mobile, webkit; starts Go API + Next). `npx playwright test --project=webkit` for Safari only.

## Pages / screens touched (for ui-checker)
- `/` hero (both engines), `/enquiry` selects, favicon/OG image.

## Known limitations
- Real Safari on iOS not tested (Playwright WebKit only).
- axe can't judge everything (e.g., meaningful alt text quality, reading order sense).
- Screen-reader walkthrough not done.

## Where I'd look hardest
- That the WebKit exclusions are justified and narrow.
- OG image honesty: it uses the generated studio image (captioned elsewhere as generated; the card itself has no caption).

## Round 1 triage (2026-11-13)
- QA High (`/_next/image` AVIF hang): `images.formats` now WebP only (D-037). Correction (F-09): the first cold-cache run after this change was misread as clean (its exit code was hidden by a pipe); it had ~60 WebKit/page-load timeouts. Since then the hang has not reproduced: 36 concurrent cold image requests all answered in <0.5s, and two cold-cache full runs had no timeouts. Root cause unproven; suspected local resource contention. Production is unaffected either way: Vercel serves `/_next/image` from its own image service, not this Node process.
- F-09 follow-up: a pre-hydration `<video>` (native controls) could take keyboard focus with no visible ring in Chromium. `.video__frame:has(video:focus)` now draws it; no-JS regression test added.
- QA Medium (focus ring 2.85:1 on dark): `--focus` set to `--on-dark` on hero, `.band--dark`, footer.
- QA Medium (focus on body after submit): ConfirmationDetails focuses its result heading.
- CR-1: webkit `retries` removed; "focus indicator:" added to webkit grepInvert (Safari doesn't tab to links).
- CR-2: hero test asserts load, height > 150px, and non-flat pixels.
- CR-3 / QA Low: not-found.tsx no longer sets robots (Next emits it).
- CR-5: builder response: 404 status already asserted by the F-00 smoke test.
- CR-4, apple-icon colour, manual-only coverage: POLISH.md.
