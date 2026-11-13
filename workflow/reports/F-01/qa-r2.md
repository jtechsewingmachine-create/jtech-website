# QA Report — F-01: Site shell — Round 2

## Verdict
PASS (0 Critical, 0 High, 0 Medium, 0 Low open)

## What I checked
Full suite re-run: `cd web && npx playwright test` — 32 passed, 0 failed, 2 skipped (keyboard tests on mobile, by design).
Only test change: the sticky-header and anchor-padding tests now assert sticky on widths above 640px and static on phones (deliberate design change for UI-1, not a weakened check; the phone case asserts position static and that the header scrolls out of view). The scroll in that test now uses instant behavior because the page has smooth scrolling.

## Fixed since last round
- QA-1 (nav clipped at 320px): Verified fixed. Test "all four nav links visible in viewport (not clipped) at 320 and 375" passes in both projects.
- QA-2 (stale layout.tsx comment): Verified fixed per builder; no code regression seen.

## Issues
None open.

## Notes for the Builder
No new regressions: tap targets, contrast, 404 status, single h1/main, no console errors, and odd-URL tests all still pass.
