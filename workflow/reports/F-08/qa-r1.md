# QA report F-08 (SEO + a11y hardening), Round 1

Verdict: **FAIL (changes requested)**. Counts: Critical 0, High 1, Medium 2, Low 3.

## Run
`cd web && npx playwright test` (desktop, mobile, webkit). My new tests: `tests/qa/F-08-qa.spec.ts` (13 tests per project; preview-robots test is skipped unless `PREVIEW_URL` is set).
- Run A (warm image cache, before my spec): 217 passed, 2 skipped, 0 failed.
- Run B (with my spec, warm-ish cache): 625 passed, 6 failed, 1 flaky, 11 skipped. Failures = my 3 findings below x projects, plus one intermittent timeout (see H-1).
- Run C (cold image cache): 568 passed, 67 failed, 11 skipped (26 min). ~55 failures are 30s `page.goto` timeouts, mostly WebKit, on `/` and `/machines`. See H-1.
- Preview robots: built with `SITE_ENV=preview`, `next start -p 3103`, `PREVIEW_URL=http://127.0.0.1:3103 npx playwright test F-08-qa -g SITE_ENV=preview --project=desktop` -> pass (robots.txt `Disallow: /`, `X-Robots-Tag: noindex, nofollow`). Normal build restored afterwards.
- Note: a concurrent `npm run verify`/`next build` by another process in `web/` broke my first two runs (shared `.next`); I waited and reran. Avoid parallel builds.

## Issues
**H-1 (High) /_next/image hangs for the hero image, so page load never completes.**
Repro: `curl -m 60 -H "Accept: image/avif,image/webp" "localhost:3100/_next/image?url=%2Fimages%2Fstylish-stitcher-studio.jpg&w=2048&q=75"` against a `next start` -> no response in 150s (WebP-only Accept returns in 0.1s). Playwright then times out in `page.goto` (load event waits on the hero `<img>`): reproduced 4/4 with Pixel 7 at 768px (dpr 2.6 -> w=2048) via `F-02-F-03-qa "no horizontal overflow" --project=mobile --repeat-each=4`. In the cold-cache full run (Run C) WebKit failed ~55 tests the same way. After `rm -rf .next/cache/images` the same requests succeed (test `image optimiser...` passes 3/3 standalone), so it appears tied to a stuck/partial cache entry or concurrent cold AVIF encodes (sharp 0.35.5, Node 25.9). Root cause not proven; I did kill servers mid-run during the session, which may have left a partial cache file, but Run C had a clean start and still hung. Expected: every `/_next/image` request answers fast (web/CLAUDE.md rule 5, hero is LCP). Test: `F-08-qa.spec.ts` "image optimiser: every default device width...". Builder: investigate (pin/replace sharp, drop AVIF or pre-generate hero variants, check Node version), and confirm it is not an F-08 change (hero markup changed in this feature).

**M-1 (Medium) Focus ring fails 3:1 on dark surfaces (WCAG 1.4.11).** Outline is `#C8161D` 3px; on header/footer/video-section bg `#1E1E1E` the ratio is 2.85:1. Affects header nav, footer links, "See product details", "Play video". Handoff claims focus contrast evidence. Test: "focus indicator: every tab stop..." (fails; lists each element). Fix: lighter outline on `.dark` surfaces (e.g. `#fff` or `#FF4B52`).

**M-2 (Medium) Focus is lost after keyboard submit success.** Keyboard-only journey (home -> machine -> enquiry -> Enter on Send) reaches "Enquiry sent" but `document.activeElement` is `BODY`. Keyboard/screen-reader users restart from the top; heading should receive focus. Test: "keyboard: skip link -> ... -> confirmation" (fails only on that last assertion; everything before it passes, so the keyboard path itself works).

**L-1 (Low) 404 page emits two robots meta tags** (`noindex` and `noindex, follow`). Harmless but untidy. Test: "metadata: unknown route is 404..." (soft assertion).
**L-2 (Low) WebKit "focus indicator" test is flaky** (Safari tabs only to form controls; name does not start with "keyboard: " so the project's grepInvert does not exclude it). Test-side; I did not weaken it. Builder may rename to "keyboard: ..." to exclude from webkit.
**L-3 (Low) Not covered:** real screen reader, real iOS Safari, forced-colors in WebKit (Chromium-only emulation).

## Passing checks (new)
- Metadata on 9 routes: unique titles and descriptions, lengths within bounds, absolute self-canonical, absolute og:image/twitter:image, og:title = title; `/enquiry`, `/enquiry/confirmation`, `/locations` noindex.
- 404 route returns 404 + noindex.
- Production robots.txt: `Disallow: /api/`, no `/_next`, sitemap listed; no X-Robots-Tag.
- Preview robots (see above).
- 320px reflow on every route plus 404: no horizontal scroll (desktop and webkit; mobile fails only via H-1 timeout, passes on retry/warm cache).
- Reduced motion on every route: no infinite animations, no autoplaying video.
- Forced-colors (Chromium): outline kept, controls keep borders, no overflow.
- Keyboard: skip link first; invalid submit focuses the error summary and its link reaches the field.
