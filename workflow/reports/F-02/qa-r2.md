# QA Tester Report — F-02 + F-03: Catalogue listing and Homepage — Round 2

## Verdict
PASS (0 Critical, 0 High, 0 Medium, 0 Low new)

## What I checked
Command: `cd web && npx playwright test` — 108 passed, 0 failed, 2 skipped (pre-existing F-01 mobile skips) after my test update. Before the update, 106 passed and 2 failed: only my own card-copy test, which asserted the old copy.
- Updated `tests/qa/F-02-F-03-qa.spec.ts` card test to the new copy: "Type awaiting confirmation" badge, no "Electric", no "compact", no "drawer", "Sample option: machine head only", "Suitability: awaiting confirmation" on all 3 cards. Price, unavailable and Photo pending checks unchanged.
- Regression: all earlier F-00, F-01, builder F-02/F-03 and my R1 tests pass, including the honesty-copy scan, overflow at 320-1440, 768 card bounds, no-JS render, FocusOnHash cases and video keyboard/failure paths (after the aria-pressed and native-controls change).
- Not covered: real H.264 playback, Safari mask rendering, visual review.

## Issues
None open.

## Fixed since last round
- QA-1 (/machines h1 lacks target query): Verified fixed. h1 test passes on desktop and mobile.
- QA-2 (/support, /locations, /enquiry 404): Still open, expected until those features ship.
- QA-3 (networkidle never reached): Not re-investigated; Low, likely clears with F-04.

## Notes for the Builder
Nothing new.
