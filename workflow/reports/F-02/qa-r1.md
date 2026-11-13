# QA Tester Report — F-02 + F-03: Catalogue listing and Homepage — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 2 Low)

## What I checked
Command: `cd web && npx playwright test` (desktop + Pixel 7). My file: `tests/qa/F-02-F-03-qa.spec.ts` (60 runs: 58 pass, 2 fail = QA-1 evidence, desktop+mobile). Builder's `F-02-F-03-catalogue-home.spec.ts` and the F-00/F-01 suites all pass (regression clean).
- Happy flow: hero, Help me choose focus, 3 cards, labels (awaiting / not a real offer / unavailable / Photo pending), Choosing Help from /machines, video toggle (failure path in Chromium).
- Console errors, broken images, duplicate ids, alt text, link names, heading-level skips, overflow at 320/375/768/1440, 768 card bounds.
- Head: title <=60, description, canonical. Sitemap child lists /machines.
- Honesty copy scan (best, guarantee, in stock, discount, certified, etc.): none found.
- Injection in query/hash (`<script>`, `' OR 1=1`, img onerror): 200, no dialog, no reflection.
- No-JS rendering of both pages. Media served (7 images, mp4 range request 206, video/mp4).
- Behaviour: double-click Help me choose, repeat jump after focus moved, back/forward, direct `/#choosing-help`, bad/malformed hash, keyboard Tab from focused heading, reduced motion, video blocked by network abort, keyboard Enter on Play, unknown slug 404, `/machines/`.
- Not covered: real H.264 playback (Chromium lacks codec), Safari mask rendering, visual judgement (ui-checker's job), auth/data/server-failure (no such features here).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| QA-1 | Medium | `web/app/machines/page.tsx` h1; `web/lib/routes.ts` | `/machines` h1 is "Explore Jtech sewing machines" but the registered targetQuery is "jtech sewing machine models"; the h1 does not carry the target query. | Test `machines h1 carries the registered target query` fails: expected substring "models", received "explore jtech sewing machines". Open /machines. | Change h1 to include "models" (e.g. "Explore Jtech sewing machine models"), or change the registered targetQuery and title to match. | `web/CLAUDE.md` rule 3 |
| QA-2 | Low | Header nav / page links to `/support`, `/locations`, `/enquiry?intent=trade` | These links from / and /machines return 404 today. Expected until their features land, but the home "View support information", "View locations" and the machines guidance links are dead ends in the prototype. | `request.get('/support')` etc. -> 404. | None needed if those features are next; make sure they ship before this is shown to anyone. | Handoff known limitations (not listed for these routes) |
| QA-3 | Low | `/` and `/machines`, any page with product links | Page never reaches `networkidle` (still requesting after 30s with a prod build, desktop). Probably Next link prefetch to the 404 detail routes, so likely clears with F-04, but unconfirmed. | `page.goto('/'); page.waitForLoadState('networkidle')` times out at 30s. I changed my test to wait for `load` plus 1.5s. | Re-check after F-04; if it persists, find what is repeatedly requesting. | none |

## Fixed since last round (Round 2+ only)
N/A (Round 1).

## Notes for the Builder
- No test-side bugs found in FocusOnHash: double click, repeat jumps, back/forward and malformed hashes behave. Focus works on mobile once hydrated (my first mobile run raced hydration; test now waits for focus).
- On video failure the Play button is removed and cannot be retried until reload. Matches the handoff design; mentioning in case a retry is wanted.
- `/sitemap.xml` is a sitemap index pointing to `http://localhost:3000/sitemap/0.xml` (F-01 config behaviour, not this feature). Tests read `/sitemap/0.xml`.
