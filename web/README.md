# SEO starter

A Next.js project skeleton with the technical SEO layer already correct and
enforced by build gates, so it stays correct as the site grows.

Every rule in here is a real failure found on a large production site during an
audit, not a best-practice list copied from somewhere. The point is that none of
these decisions get made again per project.

## Start a new site

```bash
cp -r seo-starter my-new-site && cd my-new-site
npm install
```

Then, in order:

1. **Edit `lib/site.config.ts`.** Name, URL, description, organization facts.
   Keep the organization values identical to your LinkedIn, Crunchbase and
   Wikipedia entries — conflicting facts across sources are why AI assistants
   hedge or get a brand wrong.
2. **Fill `lib/routes.ts`** from your search research. One row per page, with
   the five fields: target query, intent, page type, URL slug, cluster parent.
   Decide the URLs here; they are the expensive thing to change later.
3. **Create the page files** to match. Each one is three lines of boilerplate:
   `const PATH`, `export const metadata = seoFor(PATH)`, then the component.
4. **Run `npm run verify`** before you commit anything.

## The gates

```bash
npm run check:routes   # instant, no server: validates the registry
npm run verify         # registry + production build + crawler-visible HTML
```

`check-routes` catches what is knowable before a build: duplicate titles and
descriptions, titles over 60 characters, bad URL shape, broken cluster parents,
orphan pages, raw HTML leaking into metadata, and **two pages chasing the same
search** — which splits their signals so both lose, and which nothing else in
the toolchain will tell you about.

`check-render` boots the built site and fetches every registered route with no
JavaScript executing. That is deliberately what most AI crawlers see, and close
to what Googlebot sees before rendering. It fails on an empty `<main>`, a
missing or duplicated `<h1>`, a missing canonical or description, an image whose
source only resolves via `data-src`, an unknown URL that does not return 404,
a `robots.txt` that blocks rendering resources, and a sitemap that is advertised
but does not resolve.

Both gates earned their place during this template's own build: between them they
caught a sitemap index that 404'd while `robots.txt` advertised it, and a
`Disallow: /_next/static/chunks/` that would have blocked the JS bundles and left
crawlers an empty page.

**If a gate is in the way, fix the code.** A check edited down to pass is worse
than no check, because it still reads as though it is protecting you.

## What is here, and why

| File | What it guarantees |
| --- | --- |
| `lib/site.config.ts` | One source for every site-wide fact, so the site never tells two stories about itself |
| `lib/routes.ts` | No page exists without a title, description, canonical and its research fields |
| `lib/seo.ts` | Metadata, Organization + WebSite JSON-LD, breadcrumbs — all generated, never hand-written |
| `components/Img.tsx` | Images cannot ship JS-dependent, without `alt`, or without dimensions |
| `app/robots.ts` | AI crawlers allowed on purpose; rendering resources never blocked |
| `app/sitemap.ts` | Auto-splits at 40,000 URLs, so the 50,000 cap can never be breached silently |
| `app/sitemap.xml/route.ts` | A real index at the conventional URL, pointing at chunks that resolve |
| `app/not-found.tsx` | Unknown URLs return a real 404, never a 200 redirect to a parent |
| `next.config.ts` | Referrer-Policy, HSTS, CSP, nosniff; AVIF/WebP; build fails on type errors |
| `app/globals.css` | 16px body text, 44px tap targets, no layout shift, no webfont request |
| `CLAUDE.md` | The twelve rules, so AI-written code does not undo any of the above |

## Deliberate choices worth knowing

**No webfont.** `next/font/google` fetches at build time, so the build fails
outright on any network that blocks `fonts.googleapis.com` — including plenty of
CI runners. The system stack costs no request and has no flash of invisible
text. To add one, import from `next/font` with `display: "swap"` and
`variable: "--font-sans"`; `globals.css` already prefers that variable.

**The registry, not per-file metadata.** Colocating the five fields in each page
file reads nicer, but the sitemap has to enumerate every route, which means
either a build-time filesystem scan or a second list that can drift. One
registry keeps a single source of truth, makes the sitemap trivial, and lets
TypeScript catch a page that references an unregistered path.

**Vercel to start.** Next.js is not tied to it — the same app runs on Cloudflare,
GCP, AWS or a plain server. Move only when a specific site's traffic makes it
expensive; do not solve high-traffic hosting before having high traffic. **But
Vercel's free Hobby plan is for non-commercial use**, so a site that sells
anything, carries advertising or represents a business needs a paid plan from the
day it goes commercial. Budget for that rather than assuming the free tier
carries it.

**Preview deployments noindex themselves.** A preview URL serves the same content
as production, so left alone it competes with the real site. `app/robots.ts`
disallows everything and `next.config.ts` sends `X-Robots-Tag: noindex` whenever
the deployment is not production. Vercel supplies that signal itself; on any
other host set `SITE_ENV=preview` on the non-production environment. The check
only ever noindexes on an explicit non-production signal, so a production deploy
with no environment variables set stays indexable.

**Static by default.** Every page here prerenders. Add `"use client"` only to
interactive leaves, never to a page that needs to rank.

## What this does not do

Not in scope, on purpose: the visual design, the content, and the search
research that decides which pages should exist. The first two go on top per
project. The third happens before you touch this template — it is what fills
`lib/routes.ts`.

Also not here: analytics, consent management, and a CMS. Add them per project,
and keep third-party scripts `async` or `defer`.

One warning that cost us a correction elsewhere: if you add session recording or
heatmaps (Microsoft Clarity and the like) and you want it on only a few pages,
**put the snippet in a route-segment layout — do not install it site-wide and
filter by URL in the vendor's dashboard.** Filtering changes what you look at;
it collects exactly as much as before, and leaves the same consent surface.

## After launch

**Add the Search Console property before going live**, and verify it before
going live. Collection starts when the property is added, not when ownership is
verified — so adding it early is what protects the baseline, and verification is
what lets you read what has been collected. Submit `/sitemap.xml` once; it keeps
up by itself.

**Keep dependencies patched.** `npm run check:deps` runs an audit at high
severity and above; `.github/dependabot.yml` opens the update PRs so it does not
depend on anyone remembering. It is deliberately not part of `npm run verify`,
which must keep working offline. Watch Search Console's **Security Issues** and
**Manual Actions** reports: a hacked site shows up there first, and that is the
one kind of ranking loss that is genuinely hard to undo.
