# Decisions Log
Every choice not spelled out in the docs, every deviation from the docs, and every doc change.
Format: `## D-001 — <title>` · Date · Feature · Decision · Reason · Docs affected · Approved by (human / builder)

## D-001 — Monorepo layout: `web/` (Next.js) + `api/` (Go)
2026-11-13 · Setup · Next.js site lives in `web/`, built from `seo-starter 2` in the starter pack. Go service lives in `api/`. Design docs stay in `dev_ref/`. · Human chose Next.js + Go; one repo keeps features and commits together. · — · builder

## D-002 — Go's job is the enquiry API, not page rendering
2026-11-13 · Setup · Every page is server-rendered by Next.js (SEO rule 1). Go serves `POST /api/enquiries` and `GET /healthz`. Product data is a typed file in `web/lib/products.ts` until a verified source exists. · Blueprint has no other dynamic data; a Go product API would add a network hop to static pages for nothing. · Blueprint "Reusable product content has no implementation source" finding stays open · builder

## D-003 — Product detail uses real slugs: `/machines/[slug]`
2026-11-13 · Setup · The 3 demo models get their own statically generated pages (`/machines/demo-model-1` …). The enquiry link carries `?model=<slug>` so the form opens with that model. · Resolves the two "catalogue-to-enquiry context handoff not executable" major findings with the smallest working contract. · Blueprint flows · builder

## D-004 — Apply the blueprint's open review findings where they simplify
2026-11-13 · Setup · Product detail groups content into 3–4 sections (not 9); no acknowledgement checkbox on the enquiry form; no pincode field (visitors can put location in the message); no map placeholder on Locations; Trade Enquiry stays only in the footer and as an intent option in the form. · Each is a recommendation in "Open review findings" in `jtech-website-handoff.md`, and each removes code. · Blueprint screens: Enquiry, Locations, Product detail, Navigation · builder

## D-005 — Keep the prototype out of search with the deployment switch, not per-page noindex
2026-11-13 · F-00 · Content routes stay `indexable` in `lib/routes.ts`; the prototype deployment sets `SITE_ENV=preview`, which makes robots.txt disallow everything and sends `X-Robots-Tag: noindex`. Enquiry + confirmation are `indexable: false` permanently (utility pages). · The starter's render gate only checks indexable routes, so marking every page noindex would switch the gate off. Same privacy result, gates stay on. · STARTER-TEMPLATE-HANDOFF said indexable:false per page — deviation · builder

## D-006 — Enquiry storage target is Supabase Postgres, behind the Go API
2026-11-13 · F-07 · Go API stores enquiries in Supabase project `txcqdsbgejhyfcvamwjm` (ap-southeast-1, Postgres 17, empty `public` schema as of 2026-11-13; connector access confirmed). Table created by migration in F-07. · Keeps one database, reached only from the server. · — · builder

## D-007 — Draft target queries
2026-11-13 · F-00 · Registry needs a unique non-empty `targetQuery`; the blueprint has none (UNVERIFIED). Using plain drafts like "jtech sewing machines", marked unverified in `lib/routes.ts`. · Gate requirement. · — · builder

## D-008 — Logo redrawn as SVG
2026-11-13 · F-00 · `web/public/logo.svg` is a hand-traced vector of `dev_ref/UI ref/logo.png` (whose "transparent" background is a painted checkerboard). "Sewing Machines" uses the system Helvetica/Arial, not outlined paths. · Human approved generating an SVG. · — · human

## D-009 — Reviewer agents skipped for F-00
2026-11-13 · F-00 · F-00 is scaffolding with no app logic; the gates + smoke tests cover it. Reviewers run from F-01 on. · Setup doc asks for review after substantial features. · — · builder

## D-010 — Typeface: Red Hat Display via next/font
2026-11-13 · F-01 · Geometric sans close to the UI reference headings; self-hosted at build time, `display: swap`. · Starter warns next/font/google needs network at build; acceptable here, switch to `next/font/local` if CI blocks Google Fonts. · — · builder

## D-011 — Mobile nav is a link row, not a menu
2026-11-13 · F-01 · On phones the 4 main links sit in a row under the logo; no hamburger, no JS. · Blueprint asks for mobile navigation that closes before navigating and doesn't hide the homepage journey; a row with nothing to open meets both with zero script. · Blueprint §Navigation MobileMenuClosure — not needed · builder

## D-012 — Light theme only
2026-11-13 · F-01 · Dropped the starter's dark-mode palette. · Brand design is light with a dark band; an untested dark mode would break the red/black brand look. · — · builder

## D-013 — Footer "Contact" → `/support#contact`
2026-11-13 · F-01 · Blueprint maps Contact → Support screen; the anchor lands on the contact part of that page (built in F-06). · — · — · builder

## D-014 — Demo model 1 is the "Stylish Stitcher" from the supplied photos
2026-11-13 · F-02 · The real Jtech sample unit in `dev_ref/video image generation/assets` is labelled "Stylish Stitcher" on its body, so Demo model 1 uses that name and those photos. Only facts visible on the unit are stated (two dials); the "Japanese Technology" body text is not repeated as a claim. Models 2–3 have no photos and show the "Photo pending" state. · Human approved using the assets. · Blueprint "Demo model 1/2/3" naming · builder

## D-015 — Image labelling
2026-11-13 · F-02 · Every product image carries a caption: "Photo of a sample unit" or "Generated studio image of the sample unit". The generated video is captioned as not a recorded demonstration. Gemini watermarks are cropped out (stills by crop; video by a CSS scale-crop until ffmpeg is available). · Blueprint: generated imagery must not be presented as evidence. · — · builder

## D-016 — Mock prices only on Demo model 2, always labelled "sample price (not a real offer)"
2026-11-13 · F-02 · Shows the head-only vs package price difference the blueprint asks to test; every other price reads "awaiting confirmation". · Blueprint decision on mock prices · builder

## D-017 — Home hero is dark, not light grey
2026-11-13 · F-03 · The UI ref hero is light grey, but every usable product image has a dark studio backdrop; a dark hero lets the image blend in (edge-feathered) instead of sitting as a dark box on grey. Rest of the page follows the UI ref order and styling. · Cinematic look the owner asked for; real assets. · UI ref hero · builder

## D-018 — Home video uses its own Play/Pause button, no native controls
2026-11-13 · F-03 · Native controls get clipped by the watermark crop. One button covers the blueprint's media_playing/media_paused states; nothing autoplays; poster = still fallback; play failure shows a status message. · Simpler than per-browser control styling. · Blueprint §Homepage media states · builder

## D-019 — F-02 and F-03 reviewed together
2026-11-13 · F-02/F-03 · Both share the product card and data; one review round covers both. · Halves review cost with no loss of coverage. · — · builder

## D-020 — Home targetQuery "jtech sewing machine" (singular)
2026-11-13 · F-03 · The home h1 reads "Find your next Jtech sewing machine"; SEO rule 3 needs the h1 to carry the target query, so the draft query became singular. `/machines` keeps "jtech sewing machine models" and its h1 now contains it. Both still unverified (D-007). · Review CR-5, QA-1 · — · builder

## D-021 — Machine detail: no Product schema, breadcrumb schema only
2026-11-13 · F-04 · Product JSON-LD would advertise demo items and mock prices as real offers; only BreadcrumbList (visible trail) is emitted. Add Product schema when verified models and prices exist. · SEO rule 8 + content rules · — · builder

## D-022 — Enquiry: machine is a select in the form, not a "Change machine" link
2026-11-13 · F-05 · The blueprint's "Change machine" goes back to the listing; a select inside the form lets the visitor change machine without losing typed values. A "browse machines" link is still in the summary. · Simpler and keeps entries. · Blueprint §Enquiry `Change machine` · builder

## D-023 — Simulated submission fails only when offline; confirmation context in sessionStorage without personal data
2026-11-13 · F-05 · `simulateSubmit` waits 600 ms and fails when `navigator.onLine` is false, giving a real, testable failure path. The confirmation page receives only intent label and machine name via sessionStorage; name and number never leave the form. `/enquiry` renders per request (reads `?model`/`?intent`) and is noindex. · Blueprint: simulated lifecycle with invalid/submitting/failed/success states; privacy finding. · — · builder

## D-024 — F-04 and F-05 reviewed together
2026-11-13 · F-04/F-05 · The detail → enquiry handoff is the core journey; one review covers both ends. · Same reason as D-019. · — · builder

## D-025 — Detail and enquiry target queries follow their h1
2026-11-13 · F-04/F-05 · targetQuery became "jtech stylish stitcher", "jtech demo model 2", "jtech demo model 3", "contact jtech", "your jtech enquiry" so each h1 carries its query (SEO rule 3). Still unverified drafts (D-007); revisit with real research and real model names. · Review CR-1 · — · builder

## D-026 — Uppercase URLs 301 to lowercase (middleware)
2026-11-13 · F-04 · `web/middleware.ts` redirects any non-`/_next`, non-`/api` path containing uppercase letters. · Case-insensitive file systems served prerendered pages for case variants with 200 (QA-4); a lowercase URL is the one true successor. · web/CLAUDE.md rules 6/7 · builder

## D-027 — Enquiry phone rule: 10 digits starting 2–9, optional +91/91/0
2026-11-13 · F-05 · Rejects 0000000000/1234567890-style input; accepts Indian mobiles and landlines with STD code. Go API (F-07) must mirror it. Owner may tighten later. · QA-2 · — · builder

## D-028 — /locations is noindex while its entries are fictional; /support orphan warning accepted
2026-11-13 · F-06 · Fictional locations must never be indexed (blueprint). `/support` triggers the registry's "orphan" warning because it has no cluster; it is linked from the header, footer, home and every machine page, so the warning is a heuristic miss, not a real orphan. · — · — · builder

## D-029 — Decorative arrow kept out of link names
2026-11-13 · F-06 · `.link-arrow::after` uses `content: "→" / ""` so screen readers don't read "right arrow"; hidden link suffixes read "for X"/"at X" (e.g. "Contact about this for General repairs"). Affects every arrow link site-wide. · Found while testing accessible names. · — · builder

## D-030 — Enquiries are stored for real (human)
2026-11-13 · F-07 · Go API validates and saves enquiries to a Supabase Postgres table, server-side only (no browser access; RLS on, no anon policies), deleted after 90 days. Form drops the "simulation" wording and gains a short privacy line. Who reads enquiries is still to be named by the owner. · Human chose "Store for real". · Supersedes the simulated-only parts of D-006/D-023 · human

## D-031 — Hosting: Next.js on Vercel, Go API on Render (human)
2026-11-13 · F-09 · Vercel paid plan once commercial (starter README note). Human creates the accounts; builder writes the config. · Human choice · — · human

## D-032 — Go API talks to Supabase over REST (no DB driver), proxied same-origin by Next
2026-11-13 · F-07 · Go uses only the standard library: POST to `<SUPABASE_URL>/rest/v1/enquiries` with the server-side secret key. Next rewrites `/api/enquiries` → `API_ORIGIN` (build-time), so the browser never calls another origin (no CORS; CSP unchanged). Spam controls: per-IP fixed-window limit (5 per 10 min, `RATE_LIMIT`), honeypot field, 8 KiB body cap, JSON-only. Logs never contain personal data. The API's model list is guarded against drift by a Go test that reads `web/lib/products.ts`. · Avoids adding pgx; keeps one origin. · — · builder

## D-033 — Database is the last line of validation
2026-11-13 · F-07 · `public.enquiries` has CHECK constraints matching the API rules (name 2–80 chars, phone `^[2-9][0-9]{9}$`, intent enum, model slug shape, message ≤ 1000), RLS on with no policies, privileges revoked from anon/authenticated (verified: browser key gets 401/permission denied for insert and select), and a pg_cron job deleting rows older than 90 days. Migration kept in `supabase/migrations/`. · Defence in depth for personal data. · — · builder

## D-034 — Enquiry proxy is a Next route handler with a shared secret (supersedes the rewrite in D-032)
2026-11-13 · F-07 · `web/app/api/enquiries/route.ts` forwards to `API_ORIGIN` with `X-Proxy-Secret` and `X-Client-IP` (from Vercel's x-forwarded-for). The Go API requires the secret in production (403 otherwise; refuses to start without `PROXY_SECRET`), trusts `X-Client-IP` only with a valid secret, and never reads X-Forwarded-For. Rate limiting now counts every request, and JSON with trailing data is rejected. · Review CR-1/CR-2/CR-4, QA-1/QA-2/QA-3/QA-4: the rewrite + left-most XFF let anyone bypass the limit, and the API was reachable directly. · — · builder

## D-035 — Accessibility + cross-browser gates in the test suite
2026-11-13 · F-08 · `@axe-core/playwright` (dev only) scans every route and the form error/success states for WCAG 2.2 A/AA; heading order, reduced motion, tap targets (≥44px tall, ≥24px wide), sitemap contents, OG image/icon/logo resolution are asserted. A WebKit (Safari engine) project runs the suite except Tab-key tests (Safari's default skips links) and one back/forward/reload test that crashes the WebKit engine itself. · Blueprint a11y findings ask for evidence, not intent. · — · builder

## D-036 — Social card, raster logo, favicon
2026-11-13 · F-08 · `public/og.png` (1200×630) rendered from HTML with the generated studio image and the logo; `public/logo.png` (transparent) for Organization JSON-LD, since Google requires a raster logo; `app/icon.svg` and `app/apple-icon.png` from the J mark. Regenerate if the logo changes. · Starter referenced a missing /og.png. · — · builder

## D-037 — WebP only for next/image; focus ring white on dark surfaces
2026-11-13 · F-08 · `images.formats` is `["image/webp"]` (AVIF dropped). Focus outline uses `var(--focus, var(--red))`; hero, `.band--dark` and footer set `--focus` to `--on-dark`. The confirmation page moves focus to its result heading after client navigation. · QA-r1 High: cold AVIF encodes of the 1800px hero hung `/_next/image` (Accept avif) and timed out page loads; WebP-only requests returned in 0.1s. QA-r1 Medium: red focus ring was 2.85:1 on #1E1E1E (WCAG 1.4.11 needs 3:1), and focus landed on <body> after submit. · — · builder
