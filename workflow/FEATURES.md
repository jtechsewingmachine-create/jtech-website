# Features

Status: `todo` · `in-progress` · `done` · `blocked`

Main doc: `dev_ref/wireframe output/jtech-website-handoff.md` (called "Blueprint" below). Visual: `dev_ref/UI ref/Jtech homepage with red heading accents.png` ("UI ref").

| ID | Feature | Depends on | Docs | Wireframes | UI? | Status | Done on |
|----|---------|-----------|------|------------|-----|--------|---------|
| F-00 | Project foundation | — | starter pack, D-001 | — | Yes | done | 2026-11-13 |
| F-01 | Site shell: brand styles, header, footer, mobile nav | F-00 | Blueprint §Navigation | UI ref (header/footer) | Yes | todo | |
| F-02 | Demo catalogue data + Machines listing `/machines` | F-01 | Blueprint §Machines, §Product listing | UI ref (demo range) | Yes | todo | |
| F-03 | Homepage `/` | F-02 | Blueprint §Homepage | UI ref (whole page) | Yes | todo | |
| F-04 | Product detail `/machines/[slug]` | F-02 | Blueprint §Representative Machine Detail, D-003/D-004 | UI ref (style) | Yes | todo | |
| F-05 | Enquiry form + confirmation (simulated in browser) | F-04 | Blueprint §Enquiry, §Enquiry Confirmation | UI ref (style) | Yes | todo | |
| F-06 | Support `/support` + Locations `/locations` | F-01 | Blueprint §Support, §Locations | UI ref (style) | Yes | todo | |
| F-07 | Go enquiry API + connect form | F-05 | D-002, D-006 | — | No | todo | |
| F-08 | SEO + accessibility hardening pass | F-03..F-07 | starter CLAUDE.md, Blueprint §States/a11y findings | — | Yes | todo | |
| F-09 | Deploy (web + api) | F-08 | starter README | — | No | blocked (needs hosting decision) | |

## Feature details
### F-00 — Project foundation
- Goal: a running Next.js site from the SEO starter and a running Go service, both tested.
- Includes: `web/` from `seo-starter 2` with `site.config.ts` set to Jtech; Playwright + config pointing at `tests/qa/`; `api/` Go module with `/healthz` and a test; git remote to GitHub.
- Excludes: any real page content.
- Done when: `npm run verify` passes in `web/`; `go test ./...` passes in `api/`; one Playwright smoke test passes.

### F-01 — Site shell
- Goal: every page shares the Jtech look and navigation from the UI ref.
- Includes: colour/type tokens (red `#c8102e`-ish accent, black, white, greys), logo, header nav (Machines, Choosing Help, Support, Locations), footer (Explore / Help / Business incl. Trade Enquiry), mobile menu, skip link, focus styles, prototype notice in footer.
- Excludes: page content.
- Done when: header/footer match the UI ref at 1440/768/375; all nav items are real links; keyboard-navigable.

### F-02 — Demo catalogue + Machines listing
- Goal: one product data file drives every card and detail page.
- Includes: `web/lib/products.ts` (3 demo models, one with two package configurations, fields that can be "awaiting confirmation"); `/machines` intro, "Before choosing" guidance, product cards, empty state.
- Done when: cards show identity, image, suitability, configuration, price status and a detail link; empty data renders the empty state with enquiry route.

### F-03 — Homepage
- Includes: hero (still image, prototype label, Explore machines / Help me choose), "What would you like to sew?" (focus target for Choosing Help), demo range, "See the details in action" media block with still fallback + reduced motion, "Know what you're choosing", locations strip.
- Done when: matches UI ref section order; Help me choose moves focus to the guidance heading; works without JS.

### F-04 — Product detail
- Includes: breadcrumb nav, summary + price status + primary "Ask about this machine" near the top, gallery, configuration/contents (head-only vs package), suitability + limitations, specifications, support & learning, other models; 404 for unknown slug.
- Done when: all 3 demo slugs prerender; unknown slug returns 404; enquiry link carries the model.

### F-05 — Enquiry + confirmation
- Includes: `/enquiry` (fields: name, phone, intent [product/general/support/trade], optional message; prefilled from `?model=` and `?intent=`), validation, submitting, failure with values kept + Retry, `/enquiry/confirmation` with missing-context state. Simulated in the browser for now.
- Done when: invalid input shows text errors; failure keeps values; success shows confirmation that clearly says nothing was sent.

### F-06 — Support + Locations
- Includes: support routes (sales, demonstration, repair, warranty) with pending-information copy; learning links; locations list of 2 clearly fictional entries with service types; empty state.
- Done when: every support route has a contact action to `/enquiry?intent=…`; fictional labels visible.

### F-07 — Go enquiry API
- Includes: `POST /api/enquiries` with validation, size limits, rate limiting, CORS for the web origin; form calls it; storage behind an interface (Supabase Postgres when access is available, otherwise no-op).
- Done when: Go tests cover validation; form shows success/failure from the real API.

### F-08 — SEO + a11y hardening
- Includes: Product/Breadcrumb JSON-LD only for visible content, heading audit, contrast/focus/target-size checks, reduced-motion check, `npm run verify` green on all routes.

### F-09 — Deploy
- Needs human: hosting choice for web (Vercel suggested by starter) and Go API, domain.
