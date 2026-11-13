# QA Report — F-01: Site shell — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 1 Low)

## What I checked
- Happy flow: logo link, 4 nav links with correct hrefs, footer groups (Explore/Help/Business), prototype notice, skip link, sticky header.
- 404: unknown URL returns status 404 inside the shell; one h1 and one main on / and 404.
- Phone widths 320 and 375: no page-level horizontal scroll, 44px tap targets in header/footer, nav fit.
- Footer text contrast on dark >= 4.5:1 (computed); scroll-padding-top >= header height (for /#choosing-help); focus ring visible; no console/page errors (apart from expected 404 prefetches of unbuilt nav targets).
- Odd URLs (null byte, SQL string, script tag, path traversal): all under 500, no internals leaked.
- Regression: full suite (F-00 smoke, F-01 builder tests, my tests).
- Not covered: the /#choosing-help anchor target itself (section built in F-03); visual comparison to the UI ref (ui-checker's job); screen reader behaviour.

Run: `cd web && npx playwright test`
Result: 30 passed, 2 failed (the same test in desktop and mobile projects), 2 skipped (keyboard tests skipped on mobile by design).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-1 | Medium | `web/app/globals.css` `.site-nav` / `.site-nav ul` (max-width 40rem block) | At 320px the main nav row is 13px wider than its container, so it scrolls sideways inside the header and "Locations" is partly clipped with no scroll cue. Fine at 375px. | Open `/` at 320x640. `nav[aria-label=Main]` scrollWidth - clientWidth = 13. Test: `F-01-qa.spec.ts` "all four nav links visible in viewport (not clipped) at 320 and 375" fails with "nav scrolls horizontally at 320px, received 13". | Reduce phone gap/font a little (e.g. gap 0.5rem, font 0.8125rem) or allow `flex-wrap` so all four links fit at 320px. | Handoff "Where I'd look hardest" (fit/scroll); web/CLAUDE.md 44px targets |
| QA-2 | Low | `web/app/layout.tsx` lines 18-30 | Stale block comment says "No webfont by default" and that globals.css uses a system stack, but the file now loads Red Hat Display via `next/font/google` just above. Misleading for later maintainers. | Read the file: `Red_Hat_Display` import and `sans.variable` in use; comment says the opposite. | Delete or rewrite the comment. | Decisions D-010..D-013 |

## Notes for the Builder
- Prefetch of `/machines`, `/support`, `/locations`, `/enquiry` logs 404 console errors on `/` until those features land (expected per handoff). My console test ignores 404s only; remove that filter once those pages exist.
- `next/font/google` needs network at build time; the old comment warned about that. Fine if the build environment has access.
- New regression tests are in `tests/qa/F-01-qa.spec.ts`. QA-1's test is intentionally failing and should pass after the fix.
