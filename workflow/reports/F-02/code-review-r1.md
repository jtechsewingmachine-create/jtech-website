# Code Reviewer Report — F-02 + F-03: Demo catalogue, Machines listing, Homepage — Round 1

## Verdict
PASS WITH ISSUES
(No Critical or High issues. Three Medium issues, mostly about copy that states more than the sources support.)

## What I checked
- `git diff --cached` for all 21 staged files; read every changed source file in full (products.ts, page.tsx, machines/page.tsx, the four components, routes.ts); skimmed the globals.css and test diffs.
- Handoff, FEATURES.md F-02/F-03 "Done when", D-014..D-019, root and `web/CLAUDE.md` content rules, blueprint text for models.
- `cd web && npm run verify`: build and check-render pass, 0 errors and 0 warnings (2 routes).
- Not checked: Playwright suite (QA's job), visual match to the UI ref (ui-checker's job), Safari mask rendering, `globals.css` line by line.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | Medium | `web/lib/products.ts` (Stylish Stitcher `category: "Electric"`, `summary` "A compact Jtech machine", spec "Machine type: Portable electric machine (sample unit)") | Facts inferred from photos: "Electric", "compact" and "portable" are not visible on the unit and not supplied by the owner. D-014 says only facts visible on the unit (two dials) are stated. "Electric" also shows as the card badge on /machines and `/`. | The photos show two dials and a logo; nothing shows power type or size. Models 2/3 have `Machine type: null`, so this is inconsistent. | Set category to a neutral label (e.g. "Sample unit") or null/"Awaiting confirmation"; drop "compact"; set the Machine type spec to null. Keep "Controls" (visible). | Root CLAUDE.md "Never invent... Unknown facts show Awaiting confirmation, never an inferred value"; D-014 |
| CR-2 | Medium | `web/lib/products.ts` Demo model 3 `summary` ("with a drawer table"); Demo model 2 `includes` (["Machine head", "Jtech sewing-machine table", "Stand"]) and `category: "Traditional with table"` | "Drawer table" appears nowhere in the blueprint or handoff (grep of both). The Model 2 package contents (a "Stand") are asserted as verified contents (`includes` is documented as "Verified contents") though nothing in the docs supplies them. Possibly acceptable as labelled demo content, but it contradicts the data-model comment and D-016 only logs the prices. | Grep of `dev_ref/wireframe output/*` for "drawer": 0 hits. | Remove "drawer" from the summary. Either log in DECISIONS that the Model 2 package contents are mock (and say "sample" in the summary), or set `includes` to what the blueprint states. | Root CLAUDE.md content rules; products.ts own `includes` doc comment |
| CR-3 | Medium | `web/components/ProductCard.tsx:14-33` | F-02 "Done when" requires cards to show identity, image, suitability, configuration, price status and a detail link. Suitability is never rendered (all three are null, and the card has no "suitability: awaiting confirmation" line), unlike configuration and price. Visitors cannot tell it is pending. | `ProductCard` facts list has only configuration, price and availability. | Add a `Suitability: awaiting confirmation` (or the value) line using the same helper pattern, or log a decision to defer it to F-04. | FEATURES.md F-02 "Done when"; Blueprint §Machine catalogue (line 243) |
| CR-4 | Low | `web/lib/routes.ts:54-62`, `web/app/machines/page.tsx:20-22` | Copy promises more than exists: the /machines meta description says it shows "type, what comes in the box, price status and support details" and the page lede says "what it costs", while nearly all of these are awaiting confirmation. | Page and meta text vs. card data. | Reword to "what is still awaiting confirmation" or "price status". | Root CLAUDE.md content rules |
| CR-5 | Low | `web/lib/routes.ts:45` | Home `targetQuery` changed ("jtech sewing machines" to "jtech sewing machine") with no decision logged. Handoff mentions it; DECISIONS does not. | `git diff` of routes.ts. | One-line DECISIONS entry. | Workflow rule: unlogged deviation |
| CR-6 | Low | `web/components/DemoVideo.tsx:44,34-37` | (a) `onError` on `<video>` never fires for a failing `<source>` (the error event is on the source element and does not bubble), so only the `play()` rejection reaches the failure path; a mid-stream network error is silent. (b) A toggle button that changes its label AND sets `aria-pressed` is announced as "Pause video, pressed"; use one pattern only. (c) Without JS the button is rendered but inert (page otherwise works without JS). | Reading the code; React `onError` on `<video>` only catches element-level errors. | (a) Put `onError` on `<source>` too, or accept as is; (b) drop `aria-pressed`; (c) optional. | WCAG 4.1.2; FEATURES F-03 "works without JS" |

## Fixed since last round (Round 2+ only)
n/a (Round 1).

## Notes for the Builder
- Honesty check passed elsewhere: mock prices are always labelled "(not a real offer)" via `priceStatus` and `formatSamplePrice`; images carry source captions; the video is captioned as generated and "not a recorded demonstration"; the "Japanese Technology" text is not claimed; no reviews, ratings, warranty, certifications or competitor claims; nothing says Jtech manufactures the machines. Hero `alt` ("White Jtech Stylish Stitcher...") describes the generated image accurately.
- Structure matches the docs: a single data file drives home and /machines, `null` means awaiting confirmation, client JS is limited to two leaf components, the home empty state and the machines empty state both exist.
- `/machines/<slug>`, `/support`, `/locations`, `/enquiry` links 404 until F-04/F-05/F-06. The handoff lists only the detail pages; /support and /locations also 404 for now. Expected per FEATURES, but worth stating.
- `FocusOnHash` click handler and same-page hash logic look correct; the `setTimeout(focus, 0)` is a reasonable way to run after Next's pushState and scroll.
- `ProductCard` badge reuses "Demo" `<p className="tag">`; fine.
- The CSS scale-crop to hide the video watermark is logged (D-015) and is a taste call; ensure ui-checker looks at it at 375px.
