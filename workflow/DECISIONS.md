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
