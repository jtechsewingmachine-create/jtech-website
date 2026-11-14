#!/usr/bin/env node
/**
 * The weekly search report: the playbook's monthly routine, run by machine
 * every week so nothing waits a month to be noticed. It pulls Search Console,
 * keeps the raw data (Search Console itself discards it after 16 months), and
 * writes one report with the four checks in their fixed order:
 *
 *   1. Pages in lib/routes.ts that are not indexed  (the gate — fix first)
 *   2. Queries at position 8–20                     (the work queue)
 *   3. High impressions, low CTR                    (title problems)
 *   4. Queries no registered page targets           (pages to consider)
 *   and last, pages whose position dropped.
 *
 * It flags; it decides nothing. Every item is a review trigger, never an
 * automatic merge, rewrite or delete.
 *
 * Env: GSC_SERVICE_ACCOUNT (the service account's JSON key; add its email as a
 * user on the property), GSC_PROPERTY (e.g. "sc-domain:example.com").
 * Usage: node scripts/search-report.mjs   → monitoring/reports/<date>.md
 */
import { createSign } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://searchconsole.googleapis.com";
const DAY = 86_400_000;
const LAG_DAYS = 3; // Search Console data arrives about two to three days late.

// Thresholds are starting heuristics, not measured truths. Tune them once a
// site has real data; the playbook records any change.
export const T = { ctrFloor: 0.01, ctrMinImpr: 50, unplannedMinImpr: 10, dropPositions: 3, dropMinImpr: 20, top: 10 };

/** Same parser as check-render: the registry array literal, evaluated as data. */
export function loadRoutes(src = readFileSync(join(root, "lib/routes.ts"), "utf8")) {
  const open = src.indexOf("[", src.indexOf("=", src.indexOf("export const routes")));
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) { end = i + 1; break; }
  }
  return new Function(`return ${src.slice(open, end)};`)();
}

const b64url = (s) => Buffer.from(s).toString("base64url");

export async function token(account, fetchFn = fetch) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const jwt = body + "." + createSign("RSA-SHA256").update(body).sign(account.private_key, "base64url");
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

const day = (t) => new Date(t).toISOString().slice(0, 10);

async function call(fetchFn, auth, path, payload) {
  const res = await fetchFn(API + path, {
    method: "POST", headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Pull everything one report needs. */
export async function pull({ property, account, siteUrl, routes, now = Date.now(), fetchFn = fetch }) {
  const auth = await token(account, fetchFn);
  const end = now - LAG_DAYS * DAY;
  const range = (from, to) => ({ startDate: day(from), endDate: day(to) });
  const q = (dims, r) => call(fetchFn, auth, `/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    { ...r, dimensions: dims, rowLimit: 25000 }).then((d) => d.rows ?? []);
  const current = await q(["query", "page"], range(end - 27 * DAY, end));
  const previous = await q(["page"], range(end - 55 * DAY, end - 28 * DAY));
  const inspections = [];
  for (const r of routes.filter((r) => r.indexable !== false)) {
    const d = await call(fetchFn, auth, "/v1/urlInspection/index:inspect",
      { inspectionUrl: siteUrl + (r.path === "/" ? "/" : r.path), siteUrl: property });
    const s = d.inspectionResult?.indexStatusResult ?? {};
    inspections.push({ path: r.path, verdict: s.verdict ?? "UNKNOWN", coverage: s.coverageState ?? "unknown" });
  }
  return { current, previous, inspections, period: range(end - 27 * DAY, end) };
}

const pct = (x) => (x * 100).toFixed(1) + "%";
const pos = (x) => x.toFixed(1);
const table = (head, rows) => rows.length
  ? [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n")
  : "_Nothing flagged._";

/** Pure: data in, markdown out. Tested in search-report.test.mjs. */
export function buildReport({ routes, current, previous, inspections, period, date }) {
  // Collapse query×page rows to one row per query (impression-weighted position).
  const byQuery = new Map();
  for (const r of current) {
    const [query, page] = r.keys;
    const q = byQuery.get(query) ?? { query, pages: new Set(), clicks: 0, impressions: 0, posSum: 0 };
    q.pages.add(new URL(page).pathname);
    q.clicks += r.clicks; q.impressions += r.impressions; q.posSum += r.position * r.impressions;
    byQuery.set(query, q);
  }
  const queries = [...byQuery.values()].map((q) => ({ ...q, ctr: q.impressions ? q.clicks / q.impressions : 0, position: q.posSum / q.impressions }))
    .sort((a, b) => b.impressions - a.impressions);

  const notIndexed = inspections.filter((i) => i.verdict !== "PASS");
  const nearly = queries.filter((q) => q.position >= 8 && q.position <= 20).slice(0, T.top);
  const lowCtr = queries.filter((q) => q.impressions >= T.ctrMinImpr && q.ctr < T.ctrFloor).slice(0, T.top);
  const planned = new Set(routes.map((r) => (r.targetQuery || "").toLowerCase().trim()).filter(Boolean));
  const unplanned = queries.filter((q) => q.impressions >= T.unplannedMinImpr && !planned.has(q.query.toLowerCase().trim())).slice(0, T.top);

  const pageNow = new Map();
  for (const r of current) {
    const p = new URL(r.keys[1]).pathname;
    const v = pageNow.get(p) ?? { impressions: 0, posSum: 0 };
    v.impressions += r.impressions; v.posSum += r.position * r.impressions;
    pageNow.set(p, v);
  }
  const dropped = previous.map((r) => ({ page: new URL(r.keys[0]).pathname, was: r.position, impr: r.impressions }))
    .filter((p) => pageNow.has(p.page) && p.impr >= T.dropMinImpr && pageNow.get(p.page).impressions >= T.dropMinImpr)
    .map((p) => ({ ...p, now: pageNow.get(p.page).posSum / pageNow.get(p.page).impressions }))
    .filter((p) => p.now - p.was >= T.dropPositions)
    .sort((a, b) => (b.now - b.was) - (a.now - a.was));

  const clicks = queries.reduce((s, q) => s + q.clicks, 0);
  const impressions = queries.reduce((s, q) => s + q.impressions, 0);
  const flags = notIndexed.length + nearly.length + lowCtr.length + unplanned.length + dropped.length;

  return `# Search report — ${date}

Period: ${period.startDate} to ${period.endDate} (last 28 days with data). ${clicks} clicks, ${impressions} impressions, ${queries.length} queries. **${flags} item(s) flagged.**
Every item is a review trigger, not an instruction. Act in this order; if check 1 has entries, fix those before anything else.

## 1. Registered pages not indexed
${table(["Page", "Verdict", "Coverage"], notIndexed.map((i) => [i.path, i.verdict, i.coverage]))}

## 2. Just off page one (position 8–20) — the work queue
For each: open the page, open the results beating it, add the one thing they have that it lacks.
${table(["Query", "Position", "Impressions", "Page"], nearly.map((q) => [q.query, pos(q.position), q.impressions, [...q.pages].join(", ")]))}

## 3. Shown but not clicked (≥${T.ctrMinImpr} impressions, CTR under ${pct(T.ctrFloor)}) — likely a title problem
${table(["Query", "Impressions", "CTR", "Position"], lowCtr.map((q) => [q.query, q.impressions, pct(q.ctr), pos(q.position)]))}

## 4. Queries no registered page targets (≥${T.unplannedMinImpr} impressions)
Many are wording variants of a planned query and need nothing. A distinct intent may deserve its own registry row.
${table(["Query", "Impressions", "Currently shown page"], unplanned.map((q) => [q.query, q.impressions, [...q.pages].join(", ")]))}

## Last: what dropped (≥${T.dropPositions} positions vs the previous 28 days)
Look and understand; do not react inside two weeks.
${table(["Page", "Was", "Now"], dropped.map((p) => [p.page, pos(p.was), pos(p.now)]))}
`;
}

async function main() {
  const account = JSON.parse(process.env.GSC_SERVICE_ACCOUNT || "null");
  const property = process.env.GSC_PROPERTY;
  if (!account || !property) {
    console.error("search-report: set GSC_SERVICE_ACCOUNT and GSC_PROPERTY");
    process.exit(2);
  }
  // SITE_URL is the same repository variable the live check uses.
  const siteUrl = process.env.SITE_URL || property.replace(/^sc-domain:/, "https://");
  const routes = loadRoutes();
  const data = await pull({ property, account, siteUrl: siteUrl.replace(/\/$/, ""), routes });
  const date = day(Date.now());
  mkdirSync(join(root, "monitoring/data"), { recursive: true });
  mkdirSync(join(root, "monitoring/reports"), { recursive: true });
  writeFileSync(join(root, `monitoring/data/${date}.json`), JSON.stringify(data));
  const report = buildReport({ routes, ...data, date });
  writeFileSync(join(root, `monitoring/reports/${date}.md`), report);
  console.log(report);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
