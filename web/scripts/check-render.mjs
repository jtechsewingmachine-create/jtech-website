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

/**
 * Which policy to assert. Mirrors isIndexableDeployment() in lib/site.config.ts
 * — that file is the source of truth; this is the same rule in a dependency-free
 * script, so keep the two in step.
 *
 * Added after this checker wrongly failed a preview build: a preview correctly
 * serves a blanket `Disallow: /` and advertises no sitemap, and the checker
 * asserted production rules in every mode. Production rules are never relaxed
 * to make a preview pass — the two modes assert different, equally strict
 * things.
 */
const INDEXABLE = [process.env.VERCEL_ENV, process.env.SITE_ENV]
  .filter(Boolean)
  .every((signal) => signal === "production");
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
  else {
    // Existing is not enough: a canonical pointing elsewhere hands the page's
    // ranking to that URL. Path always; host too when checking a live domain,
    // which catches a site.url still set to the template's example.com.
    const c = new URL(canonical);
    if (c.pathname.replace(/\/$/, "") !== route.path.replace(/\/$/, "")) {
      fail(route.path, `canonical points at ${c.pathname}, not this page`);
    }
    const live = new URL(BASE);
    if (!/^(localhost|127\.0\.0\.1)$/.test(live.hostname) && c.hostname !== live.hostname) {
      fail(route.path, `canonical host is ${c.hostname} but the site is served from ${live.hostname} — check site.url in lib/site.config.ts`);
    }
  }

  // --- Accidental deindexing: an indexable page told not to be indexed. The
  //     most common and most brutal silent failure, usually a staging setting
  //     that reached production. Production only; previews must noindex. ---
  if (INDEXABLE) {
    if (/noindex/i.test(res.headers.get("x-robots-tag") ?? "")) {
      fail(route.path, "X-Robots-Tag says noindex on a page that must be indexed");
    }
    if (/<meta[^>]+name=["'](?:robots|googlebot)["'][^>]+content=["'][^"']*noindex/i.test(html)) {
      fail(route.path, "a robots meta tag says noindex on a page that must be indexed");
    }
  }

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

  // --- No autoplaying video (CLAUDE.md rule 15). It spends the LCP budget before
  //     the user has asked for anything, and moves the page on load. ---
  for (const [tag] of html.matchAll(/<video\b[^>]*>/gi)) {
    if (/\sautoplay(?:[\s=>]|$)/i.test(tag)) {
      fail(route.path, `a <video> autoplays; video must play only on user request: ${tag.slice(0, 80)}`);
    }
  }

  // --- Product parity: page, Product schema and merchant feed must agree. AI
  //     shopping ranks on price and availability, and Merchant Center
  //     disapproves products whose page and feed disagree. ---
  const ldProducts = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter((d) => d?.["@type"] === "Product");
  const fed = feed.get(route.path);
  feedSeen.add(route.path);
  if (ldProducts.length > 1) fail(route.path, "more than one Product schema on the page");
  if (ldProducts.length && !fed) fail(route.path, "Product schema on the page but no item in /feeds/products.xml — add it to lib/products.ts");
  if (fed && !ldProducts.length) fail(route.path, "in the product feed but the page has no Product schema — render productJsonLd(product)");
  if (fed && ldProducts.length) {
    const ld = ldProducts[0], offer = ld.offers ?? {};
    const [amount, currency] = fed.price.split(" ");
    if (offer.price !== amount || offer.priceCurrency !== currency) fail(route.path, `price differs: feed ${fed.price}, schema ${offer.price} ${offer.priceCurrency}`);
    if (!String(offer.availability).toLowerCase().replace(/_/g, "").endsWith(fed.availability.replace(/_/g, ""))) {
      fail(route.path, `availability differs: feed ${fed.availability}, schema ${offer.availability}`);
    }
    for (const key of ["gtin", "mpn"]) if ((ld[key] ?? "") !== (fed[key] ?? "")) fail(route.path, `${key} differs between feed and schema`);
    if (ld.brand?.name !== fed.brand) fail(route.path, `brand differs: feed ${fed.brand}, schema ${ld.brand?.name}`);
    // The price a shopper sees must be the one being marked up (rule 8).
    const visible = stripTags(html).replace(/[,\s]/g, "");
    if (!visible.includes(String(Math.round(Number(amount))))) fail(route.path, `the price ${fed.price} is not shown as visible text on the page`);
    if (ld.aggregateRating && !stripTags(html).includes(String(ld.aggregateRating.reviewCount))) {
      fail(route.path, "schema carries a rating but the page does not show its review count — rating schema only for visible, real reviews");
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

// The merchant feed, read once: page path → the values the page must match.
const feed = new Map();
const feedSeen = new Set();
const feedRes = await checkStatus("/feeds/products.xml", 200, "product feed");
if (feedRes) {
  const xml = await feedRes.text();
  if (!/<rss\b[^>]*xmlns:g=/.test(xml)) fail("product feed", "not a Google-format RSS feed");
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = (tag) => item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.replace(/&amp;/g, "&");
    const link = get("link");
    if (!link) { fail("product feed", "an item has no <link>"); continue; }
    feed.set(new URL(link).pathname, {
      price: get("g:price") ?? "", availability: get("g:availability") ?? "",
      brand: get("g:brand"), gtin: get("g:gtin"), mpn: get("g:mpn"),
    });
  }
}

for (const route of routes) await checkRoute(route);

for (const path of feed.keys()) {
  if (!feedSeen.has(path)) fail("product feed", `${path} is in the feed but is not a registered, indexable page`);
}

// --- An unknown URL must 404, not 200. This is the soft-404 guard. ---
await checkStatus("/this-url-does-not-exist-xyz123", 404, "404 handling");
await checkStatus("/guides/no-such-child-xyz123", 404, "404 handling");

// --- robots.txt and the sitemap must exist and be wired to each other ---
const robots = await checkStatus("/robots.txt", 200, "robots.txt");
if (robots) {
  const body = await robots.text();
  if (INDEXABLE) {
    if (!/sitemap:/i.test(body)) fail("robots.txt", "does not reference the sitemap");
    if (/^\s*Disallow:\s*\/\s*$/im.test(body)) fail("robots.txt", "contains a blanket Disallow: /");
  } else {
    // A non-production deployment must keep itself out of the index entirely.
    if (!/^\s*Disallow:\s*\/\s*$/im.test(body)) {
      fail("robots.txt", "this is a non-production deployment, so robots.txt must carry a blanket Disallow: /");
    }
    if (/sitemap:/i.test(body)) {
      fail("robots.txt", "a non-production deployment must not advertise a sitemap");
    }
  }
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
  // line is silent — nothing reports it back to you. (In non-production the
  // loop finds nothing, since advertising one is a failure above.)
  for (const [, loc] of body.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) {
    try {
      const res = await fetch(loc.replace(/^https?:\/\/[^/]+/, BASE));
      if (!res.ok) fail("robots.txt", `advertises ${loc} but it returns ${res.status}`);
    } catch (err) {
      fail("robots.txt", `advertises ${loc} but it is unreachable: ${err.message}`);
    }
  }
}

// --- A non-production deployment must also send the header, since robots.txt
//     only stops a crawl starting and says nothing about what is already known.
if (!INDEXABLE) {
  try {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    const tag = res.headers.get("x-robots-tag") ?? "";
    if (!/noindex/i.test(tag)) {
      fail("X-Robots-Tag", `a non-production deployment must send X-Robots-Tag: noindex (got "${tag || "no header"}")`);
    }
  } catch (err) {
    fail("X-Robots-Tag", `could not read response headers: ${err.message}`);
  }
}

// The index must exist and must point at chunks that resolve. Production only:
// a preview deliberately advertises no sitemap.
const sitemap = INDEXABLE ? await checkStatus("/sitemap.xml", 200, "sitemap") : null;
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
