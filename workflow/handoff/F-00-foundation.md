# Handoff — F-00: Project foundation

## Summary
`web/` is the SEO starter configured for Jtech (site config, one registered route, placeholder homepage, logo SVG). `api/` is a Go module with `GET /healthz`. Playwright runs specs from `tests/qa/` against a production build.

## Docs this implements
- Starter pack README/CLAUDE.md; DECISIONS D-001, D-002, D-005, D-007, D-008

## Files changed
- `web/` — copied from `seo-starter 2`; edited `lib/site.config.ts`, `lib/routes.ts`, `lib/seo.ts` (foundingDate optional), `app/page.tsx`, `app/layout.tsx`, `package.json`; removed `app/guides`; added `playwright.config.ts`, `public/logo.svg`
- `api/main.go`, `api/main_test.go`, `api/go.mod`
- `tests/qa/F-00-smoke.spec.ts`, `tests/qa/package.json`, `tests/qa/node_modules` (symlink to `web/node_modules`)

## How to run it
- `cd web && npm install && npm run dev` → http://localhost:3000
- `cd web && npm run verify` · `cd web && npx playwright test`
- `cd api && go run .` → http://localhost:8080/healthz · `go test ./...`

## Known limitations
- `SITE_URL` defaults to localhost; real domain set in F-09.
- `/og.png` referenced by metadata does not exist yet (F-08).
