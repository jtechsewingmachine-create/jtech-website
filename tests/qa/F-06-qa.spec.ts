import { test, expect } from "@playwright/test";

test("support/locations return 200 with one h1 and no horizontal overflow", async ({ page }) => {
  for (const p of ["/support", "/locations"]) {
    const r = await page.goto(p);
    expect(r?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, p).toBeLessThanOrEqual(0);
  }
});

test("support is noindex-consistent and absent from sitemap if noindex; locations absent from sitemap", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).not.toContain("/locations");
  for (const p of ["/support", "/locations"]) {
    const html = await (await request.get(p)).text();
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    if (noindex) expect(sm).not.toContain(p);
    if (p === "/locations") expect(noindex).toBe(true);
  }
});

test("no invented contact details, addresses or warranty durations", async ({ page }) => {
  for (const p of ["/support", "/locations"]) {
    await page.goto(p);
    const t = (await page.locator("main").innerText()) || "";
    expect(t, p).not.toMatch(/\+?\d[\d\s-]{8,}\d/); // phone-like
    expect(t, p).not.toMatch(/[\w.]+@[\w.]+\.\w+/);
    expect(t, p).not.toMatch(/\b(km|miles|open now|24\/7|authorised service centre)\b/i);
    expect(t, p).not.toMatch(/lorem|TODO/i);
  }
});

test("every route card maps to the intended enquiry intent and form preselects it", async ({ page }) => {
  const expected: Record<string, string> = {
    "Buying a machine": "product",
    Demonstrations: "product",
    "General repairs": "support",
    "Warranty service": "support",
    "Trade enquiries": "trade",
  };
  for (const [name, intent] of Object.entries(expected)) {
    await page.goto("/support");
    await page.getByRole("link", { name: new RegExp(`Contact about this for ${name}`) }).click();
    await expect(page).toHaveURL(new RegExp(`intent=${intent}$`));
    await expect(page.getByLabel(/What would you like help with/)).toHaveValue(intent === "product" ? "product" : intent);
  }
});

test("locations CTAs reach the enquiry with support intent; support->locations link works", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("link", { name: "View locations" }).click();
  await expect(page).toHaveURL(/\/locations$/);
  await page.getByRole("link", { name: /Ask about service near me at Example Repair Point B/ }).click();
  await expect(page).toHaveURL(/\/enquiry\?intent=support$/);
  await expect(page.getByLabel(/What would you like help with/)).toHaveValue("support");
});

test("fictional labelling present for all entries and not claiming authorisation", async ({ page }) => {
  await page.goto("/locations");
  const t = await page.locator("main").innerText();
  expect(t.match(/Fictional example/g)?.length).toBe(2);
  expect(t).toMatch(/not real Jtech locations/);
  const warranty = page.locator(".location-list li", { hasText: "Authorised warranty service" });
  await expect(warranty).toHaveCount(0);
});

test("#contact direct load: visible below sticky header and focusable", async ({ page }) => {
  await page.goto("/support#contact");
  const box = await page.locator("#contact").boundingBox();
  const header = await page.locator("header").first().boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) - 1);
  await page.locator("#contact").focus();
  await expect(page.locator("#contact")).toBeFocused();
});

test("link text is distinguishable for screen readers (no duplicate accessible names)", async ({ page }) => {
  for (const p of ["/support", "/locations"]) {
    await page.goto(p);
    const names = await page.locator("main a").evaluateAll((as) => as.map((a) => (a.textContent || "").trim().replace(/\s+/g, " ")));
    const links = names.filter((n) => /Contact about this|Ask about service/.test(n));
    expect(new Set(links).size, p).toBe(links.length);
  }
});

test("hostile query strings on enquiry link targets do not break pages", async ({ page }) => {
  const r = await page.goto("/support?x=<script>alert(1)</script>");
  expect(r?.status()).toBe(200);
  await expect(page.locator("main script")).toHaveCount(0);
  const r2 = await page.goto("/locations/../support");
  expect(r2?.status()).toBeLessThan(500);
  const r3 = await page.goto("/locations/extra");
  expect(r3?.status()).toBe(404);
});
