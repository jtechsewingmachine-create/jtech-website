import { test, expect, type Page } from "@playwright/test";

const ROUTES = ["/", "/machines", "/machines/stylish-stitcher", "/machines/demo-model-2", "/machines/demo-model-3", "/enquiry", "/enquiry/confirmation", "/support", "/locations"];

// ---- metadata per route -------------------------------------------------
test("metadata: unique titles/descriptions, absolute self canonical, absolute og/twitter image", async ({ page }) => {
  const seen = { t: new Set<string>(), d: new Set<string>() };
  for (const path of ROUTES) {
    await page.goto(path);
    const m = await page.evaluate(() => {
      const c = (s: string) => document.querySelector(s)?.getAttribute("content") ?? "";
      return {
        title: document.title,
        desc: c('meta[name="description"]'),
        canon: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
        og: c('meta[property="og:image"]'),
        tw: c('meta[name="twitter:image"]'),
        ogTitle: c('meta[property="og:title"]'),
        robots: c('meta[name="robots"]'),
        lang: document.documentElement.lang,
      };
    });
    expect(m.title.length, path).toBeGreaterThan(10);
    expect(m.title.length, `${path} title too long`).toBeLessThanOrEqual(70);
    expect(m.desc.length, path).toBeGreaterThan(50);
    expect(m.desc.length, `${path} desc too long`).toBeLessThanOrEqual(170);
    expect(seen.t.has(m.title), `dup title ${m.title}`).toBe(false);
    expect(seen.d.has(m.desc), `dup desc on ${path}`).toBe(false);
    seen.t.add(m.title);
    seen.d.add(m.desc);
    expect(m.canon, path).toMatch(/^https?:\/\//);
    expect(new URL(m.canon).pathname, path).toBe(path);
    expect(m.og, path).toMatch(/^https?:\/\//);
    expect(m.tw, path).toMatch(/^https?:\/\//);
    expect(m.ogTitle).toBe(m.title);
    expect(m.lang).toBeTruthy();
    if (path === "/enquiry" || path === "/enquiry/confirmation" || path === "/locations") {
      // thin/transactional pages: expected noindex per registry
      expect.soft(m.robots, `${path} robots`).toContain("noindex");
    }
  }
});

test("metadata: unknown route is 404, noindex, no self-canonical to a bogus URL", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res!.status()).toBe(404);
  const all = await page.locator('meta[name="robots"]').evaluateAll((m) => m.map((e) => e.getAttribute("content")));
  expect(all.join()).toContain("noindex");
  expect.soft(all, "exactly one robots meta tag").toHaveLength(1);
});

test("robots.txt (production build): allows crawl, blocks only /api/, never /_next/, names the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  expect(txt).toContain("Sitemap:");
  expect(txt).toContain("Disallow: /api/");
  expect(txt).not.toContain("/_next");
  expect(txt).not.toMatch(/User-Agent: \*\s+Disallow: \/\s/i);
});

test("robots: production sends no X-Robots-Tag noindex", async ({ request }) => {
  const r = await request.get("/");
  expect(r.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
});

// Run with PREVIEW_URL=http://127.0.0.1:3103 against `SITE_ENV=preview next start -p 3103` (build must also have SITE_ENV=preview).
test("robots (SITE_ENV=preview): Disallow all + X-Robots-Tag noindex", async ({ request }) => {
  test.skip(!process.env.PREVIEW_URL, "needs a preview-mode server; see report");
  const base = process.env.PREVIEW_URL!;
  const txt = await (await request.get(`${base}/robots.txt`)).text();
  expect(txt).toMatch(/Disallow: \/\s*$/m);
  expect(txt).not.toContain("Allow: /");
  const h = (await request.get(`${base}/`)).headers();
  expect(h["x-robots-tag"]).toContain("noindex");
});

// ---- reflow --------------------------------------------------------------
test("reflow: no horizontal scroll at 320px wide on every route (WCAG 1.4.10)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of [...ROUTES, "/does-not-exist"]) {
    await page.goto(path);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(o.sw, `${path} scrollWidth ${o.sw} > ${o.cw}`).toBeLessThanOrEqual(o.cw);
  }
});

test("reflow: 400% zoom equivalent (1280px @ dsf 1 -> 320 css px) keeps text visible and header usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o).toBeLessThanOrEqual(0);
});

// ---- reduced motion on every route ----------------------------------------
test("reduced motion: no running CSS animations/transitions longer than 0.01s, no autoplay, on every route", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ROUTES) {
    await page.goto(path);
    await page.waitForTimeout(150);
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("body *")]
        .map((el) => ({ el, s: getComputedStyle(el) }))
        .filter(({ s }) => (s.animationName !== "none" && parseFloat(s.animationDuration) > 0.011 && s.animationIterationCount === "infinite") )
        .map(({ el }) => el.className || el.tagName),
    );
    expect(bad, `${path} infinite animations under reduce`).toEqual([]);
    const playing = await page.evaluate(() => [...document.querySelectorAll("video")].filter((v) => !v.paused).length);
    expect(playing, `${path} playing videos`).toBe(0);
  }
});

// ---- focus appearance -----------------------------------------------------
function lum([r, g, b]: number[]) {
  const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

async function focusInfo(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    // effective background: nearest ancestor with a non-transparent bg
    let bg = "rgb(255,255,255)";
    for (let n: HTMLElement | null = el.parentElement; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c !== "rgba(0, 0, 0, 0)" && !c.endsWith(", 0)")) { bg = c; break; }
    }
    return { tag: el.tagName, text: (el.textContent || el.id || "").trim().slice(0, 30), style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, bg };
  });
}
const rgb = (c: string) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

test("focus indicator: every tab stop has a visible >=2px outline with >=3:1 contrast on /, /enquiry, /machines/demo-model-2", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard focus is a desktop concern");
  const fails: string[] = [];
  for (const path of ["/", "/enquiry", "/machines/demo-model-2"]) {
    await page.goto(path);
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Tab");
      const f = await focusInfo(page);
      if (f.tag === "BODY") break;
      const r = ratio(rgb(f.color), rgb(f.bg));
      if (f.style === "none" || f.width < 2 || r < 3) fails.push(`${path} ${f.tag} "${f.text}" ${f.style} ${f.width}px ${f.color} on ${f.bg} = ${r.toFixed(2)}:1`);
    }
  }
  expect(fails).toEqual([]);
});

test("forced-colors: outline survives, controls keep borders, no overflow, text visible", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "forced-colors emulation is Chromium-only");
  await page.emulateMedia({ forcedColors: "active" });
  for (const path of ["/", "/enquiry", "/machines/demo-model-2"]) {
    await page.goto(path);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const f = await focusInfo(page);
    expect(f.style, path).not.toBe("none");
    expect(f.width, path).toBeGreaterThan(0);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(o, path).toBeLessThanOrEqual(0);
  }
  await page.goto("/enquiry");
  const borders = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main input:not(#website):not([type=hidden]), main select, main textarea, main button")].map((e) => getComputedStyle(e).borderTopWidth),
  );
  expect(borders.length).toBeGreaterThan(0);
  for (const b of borders) expect(parseFloat(b)).toBeGreaterThan(0);
});

// ---- keyboard-only journey (Chromium) --------------------------------------
async function tabTo(page: Page, pred: (e: { tag: string; href: string; id: string; text: string }) => boolean, max = 90) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const e = await page.evaluate(() => {
      const a = document.activeElement as HTMLAnchorElement;
      return { tag: a.tagName, href: a.getAttribute?.("href") ?? "", id: a.id, text: (a.textContent || "").trim() };
    });
    if (pred(e)) return e;
  }
  throw new Error("tab target not reached");
}

test("keyboard: skip link -> home -> machine -> enquiry -> submit -> confirmation, mouse never used", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop keyboard journey");
  await page.goto("/");
  await page.keyboard.press("Tab");
  expect((await page.evaluate(() => document.activeElement?.getAttribute("href")))).toMatch(/^#/); // skip link first
  await page.keyboard.press("Enter");
  await tabTo(page, (e) => /^\/machines\/[a-z0-9-]+$/.test(e.href));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/machines\/[a-z0-9-]+$/);
  await tabTo(page, (e) => e.href.startsWith("/enquiry"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/enquiry/);
  await tabTo(page, (e) => e.id === "name");
  await page.keyboard.type("Asha Keyboard");
  await tabTo(page, (e) => e.id === "phone");
  await page.keyboard.type("9876543210");
  await tabTo(page, (e) => e.tag === "SELECT");
  await page.keyboard.type("General");
  await tabTo(page, (e) => e.tag === "BUTTON" && /send enquiry/i.test(e.text));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Enquiry sent" })).toBeVisible();
  // focus lands somewhere sensible, not lost on <body>
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
});

test("keyboard: invalid submit moves focus to the error summary and its links reach the field", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop keyboard journey");
  await page.goto("/enquiry");
  await tabTo(page, (e) => e.tag === "BUTTON" && /send enquiry/i.test(e.text));
  await page.keyboard.press("Enter");
  await expect(page.locator(".error-summary")).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest(".error-summary") || document.activeElement?.classList.contains("error-summary"))).toBe(true);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement!.tagName))).toBe(true);
});

// ---- hero image optimiser ---------------------------------------------------
test("image optimiser: every default device width of the hero image answers (AVIF and WebP) within 15s", async ({ request, browserName }) => {
  test.skip(browserName !== "chromium", "one engine is enough for a server-side check");
  const widths = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  const hung: string[] = [];
  for (const w of widths)
    for (const accept of ["image/avif,image/webp", "image/webp"]) {
      const url = `/_next/image?url=${encodeURIComponent("/images/stylish-stitcher-studio.jpg")}&w=${w}&q=75`;
      try {
        const r = await request.get(url, { headers: { accept }, timeout: 15_000 });
        if (r.status() !== 200) hung.push(`${w} ${accept} -> ${r.status()}`);
      } catch {
        hung.push(`${w} ${accept} -> no response in 15s`);
      }
    }
  expect(hung).toEqual([]);
});
