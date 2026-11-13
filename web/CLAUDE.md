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

9. **One page per search.** If a new page's `targetQuery` matches an existing
   one, they are the same page — extend it instead. The route check fails on
   duplicates.

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

Change these in one place. Duplicating a value is how a site ends up telling
two different stories about itself.
