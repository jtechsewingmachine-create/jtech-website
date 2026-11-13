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

## D-005 — All pages `noindex` until real content and search research exist
2026-11-13 · Setup · Every route row carries `indexable: false`, per the starter-template handoff. Flip per page once verified content + target query exist. · Site is a private prototype with demo content. · STARTER-TEMPLATE-HANDOFF · builder

## D-006 — Enquiry storage target is Supabase Postgres, behind the Go API
2026-11-13 · F-07 · Until the Supabase project is reachable, the Go API validates and returns success without storing (simulated, as the blueprint requires). · Supabase connector in this session is signed into a different account and cannot see project `txcqdsbgejhyfcvamwjm`. · — · builder (needs human for DB access)
