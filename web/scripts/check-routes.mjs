#!/usr/bin/env node
/**
 * Static gate on the route registry. Runs in milliseconds, needs no server.
 *
 * It enforces the things that are objectively checkable before a build, and
 * most importantly it catches keyword cannibalization — two pages chasing the
 * same search split their signals and both lose, and nothing else in the
 * toolchain will tell you it is happening.
 *
 * Usage: node scripts/check-routes.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

// Parse routes.ts without needing a TypeScript toolchain: strip the types and
// evaluate the array literal. Keeps this gate dependency-free.
function loadRoutes() {
  const src = readFileSync(join(root, "lib/routes.ts"), "utf8");
  const start = src.indexOf("export const routes");
  if (start === -1) throw new Error("Could not find `export const routes` in lib/routes.ts");
  // Seek past the type annotation: `routes: Route[] = [` contains a `[` that is
  // not the array literal, so anchor on the assignment first.
  const open = src.indexOf("[", src.indexOf("=", start));
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  if (end === -1) throw new Error("Unterminated routes array in lib/routes.ts");
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(open, end)};`)();
}

const routes = loadRoutes();
const fail = (path, msg) => errors.push(`${path}: ${msg}`);
const warn = (path, msg) => warnings.push(`${path}: ${msg}`);

if (routes.length === 0) fail("registry", "no routes registered");

const seen = { path: new Map(), title: new Map(), description: new Map(), query: new Map() };

for (const r of routes) {
  const p = r.path;

  // --- Required fields: a missing one means a page ships without a signal ---
  for (const field of ["path", "intent", "pageType", "title", "description"]) {
    if (!r[field] || String(r[field]).trim() === "") fail(p, `missing required field "${field}"`);
  }

  // targetQuery is required only for a page that is meant to be found. A
  // private or utility screen has no search target; forcing one invents search
  // demand, which is the thing this registry exists to stop.
  const hasQuery = Boolean(r.targetQuery && String(r.targetQuery).trim() !== "");
  if (!hasQuery && r.indexable !== false) {
    fail(p, 'missing "targetQuery". If this page has no search target, set indexable: false and targetQuery: null');
  }

  // A planning placeholder is not a query. The wireframe handoff legitimately
  // exports UNVERIFIED and N/A as planning markers; they must not reach an
  // indexable row, where they would read as a real search target and land in
  // the sitemap.
  const PLACEHOLDER = /^(unverified|unknown|n\/?a|tbd|todo|placeholder|none|null)$/i;
  if (hasQuery && r.indexable !== false && PLACEHOLDER.test(String(r.targetQuery).trim())) {
    fail(p, `targetQuery "${r.targetQuery}" is a planning placeholder, not a search target. Either supply the real query or set indexable: false with targetQuery: null`);
  }
  if (!("clusterParent" in r)) fail(p, 'missing "clusterParent" (use null for a pillar)');

  // --- URL shape ---
  if (p !== "/") {
    if (!p.startsWith("/")) fail(p, "path must start with /");
    if (p.endsWith("/")) fail(p, "path must not end with a trailing slash");
    if (p !== p.toLowerCase()) fail(p, "path must be lowercase");
    if (/[_\s]/.test(p)) fail(p, "use hyphens, not underscores or spaces");
    if (/[^a-z0-9/-]/.test(p)) fail(p, "path may only contain a-z, 0-9, hyphen and /");
    const depth = p.split("/").filter(Boolean).length;
    if (depth > 4) fail(p, `URL depth ${depth} exceeds 4 levels`);
  }

  // --- Uniqueness. Duplicate titles and descriptions are the commonest
  //     templating bug; a duplicate targetQuery is cannibalization. ---
  for (const [key, value] of [
    ["path", p],
    ["title", r.title],
    ["description", r.description],
    // Cannibalization only applies between pages that compete in search, so a
    // non-indexable page's query (normally null) is not compared.
    ["query", r.indexable === false ? null : r.targetQuery],
  ]) {
    if (!value) continue;
    const norm = String(value).trim().toLowerCase();
    const prior = seen[key].get(norm);
    if (prior) {
      if (key === "query") {
        // A duplicate is a review trigger, not an instruction to merge. Under
        // the settled no-automatic-pruning rule, deciding that two pages are
        // one page is a judgement, not something a gate gets to make.
        fail(p, `targetQuery "${r.targetQuery}" is already used by ${prior}. Two pages chasing one search weaken both, so this needs a decision: either they serve one intent — extend one page and 301 the other — or they serve different intents and each needs its own honest query. Do not merge automatically, and do not reword a query just to clear this check.`);
      } else if (key === "path") {
        fail(p, `duplicate path, already registered`);
      } else {
        fail(p, `${key} is identical to ${prior}; every page needs its own`);
      }
    } else {
      seen[key].set(norm, p);
    }
  }

  // --- Lengths. These are THIS TEMPLATE'S policy, not published Google limits.
  //     Google truncates the displayed title by pixel width, not character
  //     count, and rewrites the description for most results anyway. 60 and 160
  //     are practical proxies that keep titles readable and descriptions
  //     purposeful. They stay hard failures because a gate that only warns gets
  //     ignored — but say why honestly rather than claiming a rule. ---
  if (r.title && r.title.length > 60) fail(p, `title is ${r.title.length} chars; house limit is 60 (display truncation is by pixel width, so treat 60 as the safe proxy)`);
  if (r.title && r.title.length < 15) warn(p, `title is only ${r.title.length} chars; likely under-using the space`);
  if (r.description) {
    const n = r.description.length;
    if (n > 160) fail(p, `description is ${n} chars; house limit is 160 (Google rewrites most descriptions, so this is about writing one worth showing, not a published cap)`);
    else if (n < 140) warn(p, `description is ${n} chars; aim for 140-160`);
  }

  // --- Raw markup leaking into metadata. Found in production on a real site. ---
  for (const field of ["title", "description"]) {
    if (r[field] && /<[a-z/!]|&[a-z]+;|&#\d+;/i.test(r[field])) {
      fail(p, `"${field}" contains raw HTML or an HTML entity — a template escaping bug`);
    }
  }

  // --- Cluster integrity ---
  if (r.pageType === "child" && !r.clusterParent) {
    fail(p, 'pageType is "child" but clusterParent is null; a child must name the pillar it sits under');
  }
  if (r.clusterParent) {
    if (r.clusterParent === p) fail(p, "clusterParent points at itself");
    else if (!routes.some((o) => o.path === r.clusterParent)) {
      fail(p, `clusterParent "${r.clusterParent}" is not a registered route`);
    } else if (p !== "/" && !p.startsWith(`${r.clusterParent === "/" ? "" : r.clusterParent}/`)) {
      warn(p, `URL does not sit under its clusterParent "${r.clusterParent}"; the folder path is the strongest grouping signal`);
    }
  }

  const VALID_INTENT = ["informational", "comparison", "commercial", "navigational", "local"];
  const VALID_TYPE = ["pillar", "child", "comparison", "guide", "utility"];
  if (r.intent && !VALID_INTENT.includes(r.intent)) fail(p, `intent "${r.intent}" is not one of ${VALID_INTENT.join(", ")}`);
  if (r.pageType && !VALID_TYPE.includes(r.pageType)) fail(p, `pageType "${r.pageType}" is not one of ${VALID_TYPE.join(", ")}`);
}

// --- Orphans: an indexable page nothing links to is a page nothing finds ---
for (const r of routes) {
  if (r.indexable === false || r.path === "/") continue;
  const hasParent = Boolean(r.clusterParent);
  const hasChildren = routes.some((o) => o.clusterParent === r.path);
  if (!hasParent && !hasChildren) {
    warn(r.path, "orphan: no clusterParent and no children, so nothing links to it");
  }
}

// --- Sitemap capacity ---
const indexable = routes.filter((r) => r.indexable !== false).length;
if (indexable > 50_000) {
  const chunks = Math.ceil(indexable / 40_000);
  console.log(`  note: ${indexable} indexable routes will split across ${chunks} sitemap files`);
}

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(
  `\ncheck-routes: ${routes.length} route(s), ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);
