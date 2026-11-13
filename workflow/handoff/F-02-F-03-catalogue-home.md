# Handoff — F-02: Demo catalogue + Machines listing, and F-03: Homepage

## Summary
One product data file (`web/lib/products.ts`) now drives the product cards on `/machines` and on the homepage. Unknown facts are `null` and render as "awaiting confirmation"; mock prices are labelled "not a real offer". The homepage follows the UI ref: hero, "What would you like to sew?" (focus target for Choosing Help), demo range, a video section, "Know what you're choosing", and a locations strip.

## Docs this implements
- Blueprint §Homepage, §Machines, §Product listing (`dev_ref/wireframe output/jtech-website-handoff.md`); block copy pulled from `jtech-website-blueprint (1).json`
- UI ref: `dev_ref/UI ref/Jtech homepage with red heading accents.png`
- Rules: `web/CLAUDE.md`, root `CLAUDE.md` content rules
- Decisions D-014..D-019

## Files changed
- `web/lib/products.ts` — data model + 3 demo products + price/config status helpers
- `web/components/ProductMedia.tsx` — image + source caption, or "Photo pending"
- `web/components/ProductCard.tsx` — card + grid
- `web/components/FocusOnHash.tsx` — client leaf: focuses `#choosing-help` on load/jump
- `web/components/DemoVideo.tsx` — client leaf: click-to-play video with failure fallback
- `web/app/machines/page.tsx` — listing page (intro, guidance, grid, empty state)
- `web/app/page.tsx` — homepage
- `web/lib/routes.ts` — `/machines` row; home targetQuery → "jtech sewing machine"
- `web/app/globals.css` — card, media, hero, bands, video, guidance styles
- `web/public/images/*`, `web/public/media/hemming-demo.mp4`
- `tests/qa/F-02-F-03-catalogue-home.spec.ts`

## How to run it
`cd web && npm run build && npx next start -p 3101` → http://127.0.0.1:3101/ and /machines. Tests: `cd web && npx playwright test`.

## Happy flow
1. `/` → dark hero with the machine, "Explore machines" and "Help me choose".
2. Click "Help me choose" → scrolls to "What would you like to sew?" and focus lands on that heading.
3. Scroll → three demo cards; the Stylish Stitcher has a photo, the other two show "Photo pending"; Demo model 2 shows a sample price labelled "not a real offer"; Demo model 3 shows "Currently unavailable".
4. Video section → "Play video" plays the clip (in real Chrome/Safari); "Pause video" pauses.
5. Click "Explore machines" → `/machines`: intro, "Before choosing a machine" guidance, same 3 cards.
6. From `/machines`, click "Choosing Help" in the header → back to `/#choosing-help`, focus on the heading.

## Pages / screens touched (for ui-checker)
- `/` → UI ref (whole page). Known deviation: dark hero (D-017).
- `/machines` → no own wireframe; judge against UI ref "Explore the demo range" + blueprint Machines screen.

## API / data changes
New `Product` data model in `web/lib/products.ts` (consumed by F-04 detail and F-05 enquiry next).

## Known limitations
- "View machine details" links go to `/machines/<slug>`, built in F-04 (404 until then).
- `/machines` route-check orphan warning clears when F-04 registers the child pages.
- Playwright's bundled Chromium has no H.264, so in tests the video takes the failure path; the test checks whichever path the browser supports.
- Video watermark is hidden by a CSS scale-crop (D-015).

## Where I'd look hardest
- Honesty of copy: anything that reads like a verified claim about the machine.
- `FocusOnHash` click handling + Next `<Link>` same-page hash navigation.
- Hero mask on Safari (uses `mask-composite: intersect`; Lightning CSS adds the -webkit- prefix).
- Card layout at 768px (2-up vs 3-up borders).

## After review (round 1 → 2)
- CR-1/CR-2: removed photo-inferred facts (type "Electric", "compact", "drawer table", machine-type spec); Demo model 2 options labelled "Sample option: …".
- CR-3: cards show a Suitability line. CR-4: listing lede/description no longer over-promise. CR-5: D-020.
- CR-6: DemoVideo listens for errors on <source>, drops aria-pressed, shows native controls before hydration.
- QA-1: /machines h1 carries its target query. UI-2: grid is 3-up ≥768px, 1-up below. UI-1/UI-3 → POLISH.md.
