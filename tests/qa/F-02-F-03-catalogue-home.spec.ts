import { test, expect } from "@playwright/test";

const SLUGS = ["stylish-stitcher", "demo-model-2", "demo-model-3"];

test("machines listing shows three demo cards linking to detail pages", async ({ page }) => {
  await page.goto("/machines");
  await expect(page.locator("h1")).toHaveCount(1);
  const links = page.getByRole("link", { name: /View machine details/ });
  await expect(links).toHaveCount(3);
  for (const [i, slug] of SLUGS.entries()) {
    await expect(links.nth(i)).toHaveAttribute("href", `/machines/${slug}`);
  }
  await expect(page.getByText("Demo", { exact: true })).toHaveCount(3);
});

test("mock prices are always labelled and unknowns say awaiting", async ({ page }) => {
  await page.goto("/machines");
  const priceLines = page.locator(".product-card__facts li", { hasText: "₹" });
  for (const line of await priceLines.all()) await expect(line).toContainText("not a real offer");
  await expect(page.getByText("Price: awaiting confirmation")).toHaveCount(2);
  await expect(page.getByText("Currently unavailable")).toHaveCount(1);
});

test("listing and home content is in server HTML (no JS)", async ({ request }) => {
  for (const [path, text] of [
    ["/machines", "Before choosing a machine"],
    ["/", "What would you like to"],
  ]) {
    const html = await (await request.get(path)).text();
    expect(html).toContain(text);
    expect(html).toContain("Stylish Stitcher");
  }
});

test("Help me choose moves focus to the guidance heading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Help me choose" }).click();
  await expect(page.locator("#choosing-help")).toBeFocused();
});

test("Choosing Help from another page lands focused on the heading", async ({ page }) => {
  await page.goto("/machines");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Choosing Help" }).click();
  await expect(page).toHaveURL(/\/#choosing-help$/);
  await expect(page.locator("#choosing-help")).toBeFocused();
});

test("hero image is eager and prioritised; video never autoplays", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".hero__media img");
  await expect(hero).not.toHaveAttribute("loading", "lazy");
  const video = page.locator("video");
  await expect(video).not.toHaveAttribute("autoplay", /.*/);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("video toggle plays/pauses, or falls back to the still when the codec is missing", async ({ page }) => {
  await page.goto("/");
  // Playwright's bundled Chromium ships without H.264; real Chrome/Safari/Firefox play it.
  const canPlay = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"'));
  await page.getByRole("button", { name: "Play video" }).click();
  if (!canPlay) {
    await expect(page.getByRole("status")).toContainText("could not play");
    await expect(page.locator("video")).toHaveAttribute("poster", /hemming-demo-poster/);
    return;
  }
  await expect(page.getByRole("button", { name: "Pause video" })).toBeVisible();
  await page.getByRole("button", { name: "Pause video" }).click();
  await expect(page.getByRole("button", { name: "Play video" })).toBeVisible();
});

test("home has one h1 and no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
