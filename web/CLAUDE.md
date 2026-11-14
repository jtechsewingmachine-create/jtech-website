# Project rules

Rules for anyone — human or AI — writing code in this repo. They exist because
each one is a real failure found on a large production site, and every one is
cheap now and expensive to retrofit.

## Non-negotiable

1. **Server-render every content page.** No `"use client"` on a page that needs
   to rank. Client components are for interactive leaves only. If the content is
   not in the HTML a plain `curl` returns, the page does not exist to a crawler.

2. **Every page is registered before it is written.** Add a row to
   `lib/routes.ts` with all five research fields, then `export const metadata =
   seoFor(PATH)`. Never hand-write a `metadata` object; never create a page
   without its row. The build fails if you do.

3. **One `<h1>` per page, carrying the page's `targetQuery`.** Not just a brand
   or product name while the `<title>` targets something else.

4. **Navigation is real `<a href>`** — via `next/link`. Never `<div onClick>`
   or a router push dressed as a link. Crawlers follow anchors and nothing else.

5. **Images only through `components/Img.tsx`.** It requires `alt` and explicit
   dimensions. Never `data-src`, never a scroll-handler loader, never a bare
   `<img>`. Mark the hero image `priority`; never lazy-load it.

6. **Never change a published URL without a 301.** If a page is gone for good,
   return 410 rather than redirecting to a parent.

7. **An unknown URL returns 404.** Never redirect to a parent page with a 200.
   Redirect only when there is a genuine one-to-one successor.

8. **Schema only for content visibly on the page.** Marking up what is not
   there is a manual-action risk, not a clever trick.

9. **One page per search.** Two pages must not chase one `targetQuery`; the
   route check fails on duplicates. A duplicate is a **review trigger, not an
   instruction to merge**: either the two serve one intent, in which case extend
   one page and 301 the other, or they serve different intents and each needs
   its own honest query. Never reword a query just to clear the check.

10. **Keep `<head>` free of render-blocking scripts.** Third-party tags go
    `async` or `defer`, or do not go in at all.

11. **Analytics goes in the narrowest layout that needs it.** If a tool should
    only watch two pages, scope the snippet to those routes in a route-segment
    layout. Never install it site-wide and filter by URL in the vendor's
    dashboard: that collects everything regardless and leaves the same consent
    surface.

12. **Never make a deployment indexable by hand.** `isIndexableDeployment()` in
    `lib/site.config.ts` is the one signal `app/robots.ts` and `next.config.ts`
    both read. If a preview is being indexed, fix the environment variable — do
    not bypass the check.

Rules 13–17 were added on 14 November 2026, after audits of the design-to-build
handoff showed that an approved design image can carry things the page must not.

13. **All text is real HTML text.** Never bake a heading, copy or label into an
    image. If an image shows words that matter, those words also exist as text
    on the page.

14. **Build only the content and claims in the page's wireframe plan.** A design
    image controls the look, never the content. If it shows a rating, price,
    badge, review, statistic or tagline the plan does not contain, leave it out
    and flag it. Invented claims are rule 8's manual-action risk, arriving
    through a picture.

15. **No autoplay video and no animation on page load.** Video plays only when
    the user asks. Respect `prefers-reduced-motion`. The hero is a still image
    through `Img.tsx`, marked `priority`. The render check fails on
    `<video autoplay>`.

16. **The opening answer is visible on the first screen,** on mobile and desktop.
    A hero may sit beside or below it, never push it out of view. This is the
    layout half of "Answer first" below.

17. **Code exported by a design tool is a reference, not code to ship.** Stitch,
    v0, Figma or any generator's output is treated like the design image: rebuild
    it inside this template, through `seoFor`, `Img.tsx` and the registry, so the
    gates run on it. Never paste generated pages in whole.

## Before committing

```bash
npm run check:routes   # fast, no server
npm run verify         # routes + build + render checks
```

Both must pass. If a check is in the way, fix the code — do not weaken the
check. A build gate that gets edited down is worse than no gate, because it
still reads as if it is protecting you.

## Content structure

- **Answer first.** The direct answer goes in the opening paragraph, before any
  context or preamble. Roughly half of all AI citations come from the first 30%
  of a page, and that paragraph is what gets quoted.
- **Each section stands alone.** Content is retrieved as individual passages and
  read without the page around them: specific nouns rather than "it" and "this",
  terms defined where they appear, claims that stay true quoted in isolation.
- **No duplicated blocks.** Rendering the same section two or three times
  inflates the page and muddies main-content extraction.
- **Every page earns its existence.** Before adding one, name the thing on it
  that exists nowhere else — your data, your screenshot, your opinion. Pages
  that fail that test drag down how the whole domain is assessed; they do not
  sit harmlessly in the background.

## Where things live

| Concern | File |
| --- | --- |
| Site name, URL, organization facts, OG defaults | `lib/site.config.ts` |
| The page registry — every route and its five fields | `lib/routes.ts` |
| Metadata and JSON-LD builders | `lib/seo.ts` |
| The image component | `components/Img.tsx` |
| Headers, CSP, image formats | `next.config.ts` |
| robots.txt (AI crawlers allowed on purpose) | `app/robots.ts` |
| Sitemap, auto-splitting at 40,000 URLs | `app/sitemap.ts` |
| Live-site alert check, every six hours | `scripts/check-live.mjs`, `../.github/workflows/live-check.yml` (repo root) |
| Weekly Search Console report and its kept data | `scripts/search-report.mjs`, `../.github/workflows/search-report.yml` (repo root), `monitoring/` |

Change these in one place. Duplicating a value is how a site ends up telling
two different stories about itself.
