# Code Reviewer Report — F-01: Site shell — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 2 Medium, 2 Low)

## What I checked
- Handoff, `web/CLAUDE.md` rules in full, Blueprint §Navigation, decisions D-010..D-013, and the staged diff (`git diff --cached`).
- Build and checks: `tsc --noEmit` clean; `npm run verify` (routes + build + render check) passes with 0 errors. No `lint` script exists in the project, so no lint run.
- Playwright run: 28 passed. The `F-01-qa.spec.ts` test "all four nav links visible in viewport (not clipped) at 320 and 375" fails on both projects (see CR-1). The "no console errors" failure in the full run was a port clash with my own server; it passes when run alone.
- Not checked: `/#choosing-help` focus and reduced-motion behaviour (target section arrives in F-03); destination pages that 404 by design.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | Medium | `web/app/globals.css` (`@media (max-width: 40rem)` `.site-nav { overflow-x: auto }`) | At 320px the nav row is wider than its box, so "Locations" is clipped and only reachable by an undiscoverable sideways scroll. | Measured at 320px: `.site-nav` scrollWidth 301 vs clientWidth 288. QA test fails at 320 on desktop and mobile projects. 375px is fine. Handoff named this as a hardest-look spot. | Let the row fit: smaller gap/font at <=360px, or `flex-wrap: wrap` on the list instead of scrolling. | Blueprint §Navigation (compact, usable mobile) |
| CR-2 | Medium | `web/app/globals.css` `.site-nav` (same rule) | `overflow-x: auto` forces `overflow-y` to auto too, so the 3px focus ring plus 3px offset on nav links is clipped at the top and bottom of the 44px row on phones. | Tab to a nav link at <=640px; the outline is cut by the scroll container. Fixed automatically if CR-1 removes the overflow. | Remove the overflow container (see CR-1), or add vertical padding to `.site-nav` so the ring fits. | `web/CLAUDE.md` header ("visible focus"); handoff 44px/focus intent |
| CR-3 | Low | `web/app/layout.tsx:17-30` | The long comment still says "No webfont by default, deliberately" and that the system stack is used, directly above code that now loads `next/font/google`. Misleading for the next reader. D-010 logs the decision, but the stale comment contradicts it. | Compare the comment block with the `Red_Hat_Display(...)` call just above it. | Trim the comment to a short note pointing to D-010 and the `next/font/local` fallback. | Maintainability rule |
| CR-4 | Low | `web/components/Logo.tsx` vs `web/public/logo.svg` | Logo markup is duplicated; the file says "keep both in sync" by hand. | Two copies of the same paths. | Acceptable for now (needed for `currentColor`). If `public/logo.svg` is not referenced anywhere (e.g. OG image), delete it. | Maintainability |

## Notes for the Builder
- Design match is good: file locations, shared `lib/nav.ts`, real `next/link` anchors, skip link, `main#main` focus target, and D-010..D-013 are all logged. No unlogged deviations found.
- Footer logo red on dark (#e0262e on #1e1e1e) is about 3.5:1, which meets the 3:1 requirement for graphics.
- The `/#choosing-help` link has no target until F-03. When F-03 lands, add the section heading focus handling and the reduced-motion jump that the Blueprint lists; `scroll-padding-top` and the `prefers-reduced-motion` smooth-scroll guard are already in place.
- Your own spec only covers default viewports; consider adding the 320px nav check so CR-1 stays fixed (the QA spec already does).
- UI checker items (header height 137px on phones, footer not pinned on short pages) are covered in `ui-r1.md`; not duplicated here.
