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
  for (const field of ["path", "targetQuery", "intent", "pageType", "title", "description"]) {
    if (!r[field] || String(r[field]).trim() === "") fail(p, `missing required field "${field}"`);
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
    ["query", r.targetQuery],
  ]) {
    if (!value) continue;
    const norm = String(value).trim().toLowerCase();
    const prior = seen[key].get(norm);
    if (prior) {
      if (key === "query") {
        fail(p, `targetQuery "${r.targetQuery}" is already used by ${prior}. Two pages chasing one search weaken both — consolidate and 301 one of them.`);
      } else if (key === "path") {
        fail(p, `duplicate path, already registered`);
      } else {
        fail(p, `${key} is identical to ${prior}; every page needs its own`);
      }
    } else {
      seen[key].set(norm, p);
    }
  }

  // --- Lengths. Hard-fail where truncation is certain, warn where it is a judgement call. ---
  if (r.title && r.title.length > 60) fail(p, `title is ${r.title.length} chars; over 60 will truncate in search results`);
  if (r.title && r.title.length < 15) warn(p, `title is only ${r.title.length} chars; likely under-using the space`);
  if (r.description) {
    const n = r.description.length;
    if (n > 160) fail(p, `description is ${n} chars; over 160 will be cut off`);
    else if (n < 140) warn(p, `description is ${n} chars; aim for 140-160`);
  }

  // --- Raw markup leaking into metadata. Found in production on a real site. ---
  for (const field of ["title", "description"]) {
    if (r[field] && /<[a-z/!]|&[a-z]+;|&#\d+;/i.test(r[field])) {
      fail(p, `"${field}" contains raw HTML or an HTML entity — a template escaping bug`);
    }
  }

  // --- Cluster integrity ---
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
