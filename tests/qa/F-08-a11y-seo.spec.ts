import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/machines",
  "/machines/stylish-stitcher",
  "/machines/demo-model-2",
  "/machines/demo-model-3",
  "/enquiry",
  "/enquiry/confirmation",
  "/support",
  "/locations",
  "/does-not-exist",
];

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
}

for (const path of ROUTES) {
  test(`axe: no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    expect(await axe(page)).toEqual([]);
  });

  test(`headings on ${path}: one h1 first, no skipped levels`, async ({ page }) => {
    await page.goto(path);
    const levels = await page.locator("main").evaluate((m) =>
      [...m.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .filter((h) => (h as HTMLElement).offsetParent !== null || h.closest(".visually-hidden") === null)
        .map((h) => Number(h.tagName[1])),
    );
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `jump at ${i}: ${levels}`).toBeLessThanOrEqual(1);
  });
}

test("axe: enquiry form error and confirmation success states", async ({ page }) => {
  await page.goto("/enquiry");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".error-summary")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.getByLabel("Name (required)").fill("Asha");
  await page.getByLabel("Contact number (required)").fill("9876543210");
  await page.getByLabel(/What would you like help with/).selectOption("general");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("heading", { name: "Enquiry sent" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test.describe("reduced motion", () => {
  test("no smooth scrolling and nothing autoplays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    expect(await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused && !v.autoplay)).toBe(true);
    await page.getByRole("link", { name: "Help me choose" }).click();
    await expect(page.locator("#choosing-help")).toBeFocused();
  });
});

test("tap targets: interactive controls are at least 24x24 (WCAG 2.5.8), buttons/nav 44px tall", async ({ page }) => {
  for (const path of ["/", "/enquiry", "/machines/demo-model-2"]) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main a, main button, main select, main input:not(#website), header a, footer a")]
        .filter((el) => !el.closest("p, .prose-links, .error-summary li, .hp") && el.offsetParent !== null)
        .map((el) => ({ t: el.textContent?.trim() || el.id, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.height < 44 || r.width < 24)
        .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
    );
    expect(small, path).toEqual([]);
  }
});

test("sitemap lists indexable routes only, robots advertises it", async ({ request }) => {
  const index = await (await request.get("/sitemap.xml")).text();
  const chunk = index.match(/<loc>([^<]+)<\/loc>/)?.[1];
  expect(chunk).toBeTruthy();
  const xml = await (await request.get(new URL(chunk!).pathname)).text();
  for (const p of ["/machines", "/machines/stylish-stitcher", "/support"]) expect(xml).toContain(`${p}</loc>`);
  for (const p of ["/enquiry<", "/enquiry/confirmation", "/locations"]) expect(xml).not.toContain(p);
});

test("social card image and icons resolve", async ({ request, page }) => {
  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect((await request.get(new URL(og!).pathname)).status()).toBe(200);
  const icon = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect((await request.get(icon!)).status()).toBe(200);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  const org = ld["@graph"].find((n: { "@type": string }) => n["@type"] === "Organization");
  expect((await request.get(new URL(org.logo).pathname)).status()).toBe(200);
  expect(org.logo).toMatch(/\.png$/); // Google wants a raster logo for Organization
});

test("hero image is not hidden by a mis-prefixed mask-composite (Safari regression)", async ({ page }) => {
  await page.goto("/");
  const css = await page.locator(".hero__media img").evaluate((i) => {
    const c = getComputedStyle(i) as CSSStyleDeclaration & { webkitMaskComposite?: string };
    return { mc: c.maskComposite, wmc: c.webkitMaskComposite ?? "" };
  });
  expect(css.wmc).not.toContain("source-in");
  expect(css.mc).not.toContain("intersect");
  const img = page.locator(".hero__media img");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  const box = (await img.boundingBox())!;
  expect(box.height).toBeGreaterThan(150);
  // A masked-out image renders as flat backdrop, which compresses to a tiny PNG.
  expect((await img.screenshot()).length).toBeGreaterThan(20_000);
});
