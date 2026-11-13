#!/usr/bin/env node
/**
 * The gate that matters most: does the crawler-visible HTML contain the content?
 *
 * No browser needed, and that is the whole trick. A plain fetch with no
 * JavaScript execution is exactly what most AI crawlers see, and close to what
 * Googlebot sees before rendering. If the content is in this response, the page
 * is visible; if it is not, the page effectively does not exist no matter how
 * good it looks in your browser.
 *
 * This is the check that would have caught the production failure we audited:
 * 82% of images shipped as JS-resolved placeholders, invisible to anything that
 * does not run scripts.
 *
 * Usage: node scripts/check-render.mjs [baseUrl]
 * Expects a server already running (npm run build && npm start).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = (process.argv[2] || process.env.CHECK_URL || "http://localhost:3000").replace(/\/$/, "");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function loadRoutes() {
  const src = readFileSync(join(root, "lib/routes.ts"), "utf8");
  const start = src.indexOf("export const routes");
  // Anchor past the `Route[]` type annotation to reach the array literal.
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
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(open, end)};`)();
}

const stripTags = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fail = (ctx, msg) => errors.push(`${ctx}: ${msg}`);
const warn = (ctx, msg) => warnings.push(`${ctx}: ${msg}`);

async function checkRoute(route) {
  const url = `${BASE}${route.path}`;
  let res, html;
  try {
    res = await fetch(url, { redirect: "manual" });
    html = await res.text();
  } catch (err) {
    fail(route.path, `request failed: ${err.message}`);
    return;
  }

  if (res.status !== 200) {
    fail(route.path, `expected 200, got ${res.status}`);
    return;
  }

  // --- <main> must carry real text without any JavaScript having run ---
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) {
    fail(route.path, "no <main> element in the server HTML");
  } else {
    const text = stripTags(main[1]);
    if (text.length < 200) {
      fail(
        route.path,
        `<main> holds only ${text.length} chars of text without JavaScript — a crawler sees an empty page`,
      );
    }
  }

  // --- Exactly one h1, and it must not be empty ---
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length === 0) fail(route.path, "no <h1>");
  else if (h1s.length > 1) fail(route.path, `${h1s.length} <h1> elements; there must be exactly one`);
  else if (stripTags(h1s[0][1]).length === 0) fail(route.path, "<h1> is empty");

  // --- Heading hierarchy: no skipped levels, no empty headings ---
  const levels = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  let prev = 0;
  for (const [, lvl, inner] of levels) {
    const n = Number(lvl);
    if (stripTags(inner).length === 0) warn(route.path, `empty <h${n}>`);
    if (prev && n > prev + 1) warn(route.path, `heading jumps from h${prev} to h${n}`);
    prev = n;
  }

  // --- Title and description present and matching the registry ---
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) fail(route.path, "no <title>");
  else if (/&(?:amp|lt|gt|quot|#\d+);/.test(title) && !/&(?:amp|lt|gt|quot|#\d+);/.test(route.title)) {
    fail(route.path, `<title> contains an unescaped HTML entity: "${title}"`);
  }

  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{10,}/i.test(html)) {
    fail(route.path, "no meta description");
  }

  // --- Self-referencing absolute canonical ---
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (!canonical) fail(route.path, "no canonical link");
  else if (!/^https?:\/\//.test(canonical)) fail(route.path, `canonical "${canonical}" is not absolute`);

  // --- Open Graph ---
  for (const prop of ["og:title", "og:description", "og:url", "og:image"]) {
    if (!new RegExp(`property=["']${prop}["']`, "i").test(html)) warn(route.path, `missing ${prop}`);
  }

  // --- Images: real src, dimensions, no JS-dependent placeholders ---
  for (const [tag] of [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => [m[0]])) {
    if (/\bdata-src=/.test(tag) && !/\bsrc=["'][^"']*[^"'\s]["']/.test(tag)) {
      fail(route.path, "an <img> resolves its source from data-src — invisible without JavaScript");
    }
    const alt = tag.match(/\balt=["']([^"']*)["']/);
    if (!alt) {
      fail(route.path, `an <img> has no alt attribute: ${tag.slice(0, 80)}`);
    } else if (/^(?:image|img|photo|picture|slider image|photos)[\s_-]*\d*$/i.test(alt[1].trim()) || /\.(?:jpe?g|png|webp|avif|gif|svg)$/i.test(alt[1].trim())) {
      // A filename or a generic label is not alt text. One audited page carried
      // 22 images reading alt="Slider Image" and 22 more reading alt="Photos".
      warn(route.path, `alt text is generic or a filename: "${alt[1]}"`);
    }
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      warn(route.path, `an <img> has no explicit dimensions (layout shift): ${tag.slice(0, 80)}`);
    }
  }

  // --- Link volume. Past roughly 100 links on a page, the ones that matter get
  //     diluted by boilerplate. An audited page carried 151, mostly mega-menu
  //     and footer, drowning out its own variant and city-price links. ---
  const internal = [...html.matchAll(/<a\b[^>]*\bhref=["'](\/[^"'#?]*)/gi)].map((m) => m[1]);
  if (internal.length > 100) {
    warn(route.path, `${internal.length} internal links (${new Set(internal).size} unique); past ~100 the important ones get diluted`);
  }

  // --- Render-blocking scripts in <head> ---
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  // noModule scripts are ignored entirely by modern browsers, and JSON-LD has
  // no src to fetch, so neither blocks rendering.
  const blocking = [
    ...head.matchAll(
      /<script\b(?![^>]*\b(?:async|defer|noModule|type=["']application\/ld\+json["']))[^>]*\bsrc=/gi,
    ),
  ];
  if (blocking.length) warn(route.path, `${blocking.length} render-blocking script(s) in <head>`);
}

async function checkStatus(path, expected, ctx) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    if (res.status !== expected) fail(ctx, `${path} returned ${res.status}, expected ${expected}`);
    return res;
  } catch (err) {
    fail(ctx, `${path} request failed: ${err.message}`);
    return null;
  }
}

const routes = loadRoutes().filter((r) => r.indexable !== false);
console.log(`check-render: ${BASE}, ${routes.length} route(s)\n`);

for (const route of routes) await checkRoute(route);

// --- An unknown URL must 404, not 200. This is the soft-404 guard. ---
await checkStatus("/this-url-does-not-exist-xyz123", 404, "404 handling");
await checkStatus("/guides/no-such-child-xyz123", 404, "404 handling");

// --- robots.txt and the sitemap must exist and be wired to each other ---
const robots = await checkStatus("/robots.txt", 200, "robots.txt");
if (robots) {
  const body = await robots.text();
  if (!/sitemap:/i.test(body)) fail("robots.txt", "does not reference the sitemap");
  if (/^\s*Disallow:\s*\/\s*$/im.test(body)) fail("robots.txt", "contains a blanket Disallow: /");
  // Both forms of the same mistake: blocking rendering resources by extension,
  // or by blocking the directory they live in. The second is easy to do by
  // accident and invisible unless you look for it specifically.
  if (/Disallow:.*\.(css|js|mjs)\b/i.test(body)) {
    fail("robots.txt", "blocks CSS or JS by extension, which breaks rendering");
  }
  if (/Disallow:\s*\/_next/i.test(body)) {
    fail("robots.txt", "blocks a path under /_next/, which blocks the JS and CSS bundles and leaves crawlers an empty page");
  }

  // Every sitemap robots.txt advertises must actually resolve. A dead Sitemap:
  // line is silent — nothing reports it back to you.
  for (const [, loc] of body.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) {
    try {
      const res = await fetch(loc.replace(/^https?:\/\/[^/]+/, BASE));
      if (!res.ok) fail("robots.txt", `advertises ${loc} but it returns ${res.status}`);
    } catch (err) {
      fail("robots.txt", `advertises ${loc} but it is unreachable: ${err.message}`);
    }
  }
}

// The index must exist and must point at chunks that resolve.
const sitemap = await checkStatus("/sitemap.xml", 200, "sitemap");
if (sitemap) {
  const xml = await sitemap.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) fail("sitemap", "/sitemap.xml lists no URLs");
  for (const loc of locs) {
    const res = await fetch(loc.replace(/^https?:\/\/[^/]+/, BASE));
    if (!res.ok) fail("sitemap", `references ${loc} but it returns ${res.status}`);
  }
}

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

console.log(`\ncheck-render: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
