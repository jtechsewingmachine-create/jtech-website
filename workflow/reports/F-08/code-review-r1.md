# Code Reviewer Report — F-08: SEO + accessibility hardening — Round 1

## Verdict
PASS WITH ISSUES
(0 Critical, 0 High, 2 Medium, 3 Low)

## What I checked
- Handoff, D-035/D-036, `web/CLAUDE.md` rules in full, `git diff --cached` (all files), new spec `tests/qa/F-08-a11y-seo.spec.ts`.
- `cd web && npm run verify` (routes + build + render checks): exit 0, 0 errors / 0 warnings. `npx tsc --noEmit`: exit 0.
- Viewed `web/public/og.png` (1200x630, dark studio card with logo, headline, machine image: legible, matches site copy, no false claims; the machine image is the generated one but the card carries no "generated" caption, as the handoff says) and `web/app/apple-icon.png` (180x180, red J + dot on white; fine). `logo.png` is 600x298 RGBA.
- Ran a production server (not Playwright) and curled: unknown URLs `/does-not-exist` and `/machines/nope` return real 404 with noindex; `/sitemap.xml`, `/sitemap/0.xml`, `/robots.txt`, `/og.png`, `/icon.svg`, `/apple-icon.png`, `/logo.png` all 200 with correct content types. Sitemap lists only indexable routes. Canonical, og:image (+width/height), icon and apple-touch-icon links present.
- Site-wide SEO rules: every page uses `seoFor(PATH)` via the route registry (build gate passes); canonical self-referencing absolute; OG + Twitter complete; JSON-LD is Organization/WebSite (visible logo/name) in layout plus BreadcrumbList on machine pages, which have a visible `nav aria-label="Breadcrumb"`, so schema matches visible content. `/enquiry`, `/enquiry/confirmation`, `/locations` are noindex and excluded from the sitemap. robots.txt blocks only `/api/`, never `/_next/`.
- NOT checked: Playwright runs (QA's job), real Safari, screen reader.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| CR-1 | Medium | `web/playwright.config.ts:18` | `retries: 1` applies to the whole WebKit project, not just the flaky flow. The comment justifies it by the back/forward + reload crash, but that test is already excluded via `grepInvert`, so the retry is now stale and silently turns any real WebKit failure into "flaky pass". Contradicts the comment's own narrowness claim. | Config line 18 plus comment lines 14-17; only the excluded test is named as crashing. | Remove `retries: 1` (or limit it to CI via `retries: process.env.CI ? 1 : 0`) and delete the retry sentence from the comment. If a specific WebKit test is still flaky, name it. | Handoff "where I'd look hardest" (exclusions narrow) |
| CR-2 | Medium | `tests/qa/F-08-a11y-seo.spec.ts` (hero test, ~line 104) | The Safari regression test only reads computed `mask-composite` on the `img` in Chromium-style engines; it does not assert the hero is actually rendered with non-zero size/opacity in WebKit, and it does not cover the new `.hero__frame` mask. It guards the old bug's symptom string, not the failure (image hidden). It does run in the webkit project, so it is partly useful. | `expect(...).toBeVisible()` passes for an element with a mask that hides it (visibility ignores mask). | Add a pixel or size check, e.g. screenshot the `.hero__media` and assert the center region is not background-coloured, or at least assert `.hero__frame` computed `maskImage`/`webkitMaskImage` is a single gradient. | `web/CLAUDE.md` build-gate rule (do not weaken checks) |
| CR-3 | Low | `web/app/not-found.tsx` + served 404 HTML | The 404 response contains two robots meta tags (`noindex` from Next's not-found handling and `noindex, follow` from the page metadata). Both say noindex so harmless, but untidy. | `curl /does-not-exist \| grep 'name="robots'` shows both. | Drop `robots` from the not-found metadata (Next already adds noindex). | `web/CLAUDE.md` rule 7 (satisfied: status is 404) |
| CR-4 | Low | `web/public/`, `web/app/icon.svg` | No `/favicon.ico`. Many crawlers and older browsers request it directly and get a 404. SVG icon alone is fine for modern browsers. | `ls web/public` has no favicon.ico. | Optional: add `app/favicon.ico` (Next serves it with a link tag). | — |
| CR-5 | Low | `tests/qa/F-08-a11y-seo.spec.ts:13`, axe spec for `/does-not-exist` | The 404 route is only axe-scanned; no assertion that it returns status 404 (rule 7). I verified by curl that it does, but nothing in the suite guards it. | Earlier specs may cover it; no F-08 assertion. | Add `expect((await page.goto("/does-not-exist"))!.status()).toBe(404)`. | `web/CLAUDE.md` rule 7 |

## Fixed since last round (Round 2+ only)
n/a (Round 1).

## Notes for the Builder
- WebKit exclusions: the two `keyboard: ` tests (F-01 nav Tab order, F-02/F-03 heading focus + Tab) and `browser back from confirmation` are exactly three named tests, each with a documented reason (Safari's Tab skips links by default; engine crash in Playwright's WebKit). That is narrow and justified; Chromium (desktop + mobile) still covers them. The only unjustified part is the project-wide retry (CR-1). Note `grepInvert` is a regex over test titles, so a future test titled "keyboard: ..." will be silently excluded from WebKit; mention this in the config comment.
- Hero mask split (`.hero__frame` horizontal + `img` vertical) is a sound, minimal fix; `.hero__media picture, > img { display:block }` is needed for the wrapper to size correctly. OK.
- Custom select: chevron colour is hard-coded `#141414` in a data URI; fine on the current light inputs, and `appearance: none` removes the native focus-independent affordance only, focus styling is unchanged.
- `DemoVideo` AbortError handling is correct and minimal.
- Deployment reminders for F-09 (not defects now): `site.url` falls back to `http://localhost:3000`, so canonical, OG, sitemap and JSON-LD all say localhost until `SITE_URL` is set; and `isIndexableDeployment()` returns true when neither `VERCEL_ENV` nor `SITE_ENV` is set, while the home description says "Private prototype with sample content". Set `SITE_ENV` explicitly in every non-production deployment.
- Sitemap `lastModified` is `new Date()` at build time for every URL, which tells crawlers everything changed each deploy; consider real dates later.
- `@axe-core/playwright` is a devDependency only; lockfile change is just that package and axe-core. D-035 and D-036 are logged, so no unlogged deviation.
