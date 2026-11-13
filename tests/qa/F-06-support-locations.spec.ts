import { test, expect } from "@playwright/test";

test("support: five help routes, each to the enquiry form with an intent", async ({ page }) => {
  await page.goto("/support");
  await expect(page.locator("h1")).toHaveCount(1);
  const links = page.getByRole("link", { name: /Contact about this/ });
  await expect(links).toHaveCount(5);
  for (const l of await links.all()) await expect(l).toHaveAttribute("href", /^\/enquiry\?intent=(product|support|trade)$/);
});

test("support: unverified terms say awaiting confirmation; no invented warranty", async ({ page }) => {
  await page.goto("/support");
  await expect(page.locator(".facts dd.pending")).toHaveCount(4);
  await expect(page.locator("main")).not.toContainText(/\d+\s*(year|month)s?\s*warranty/i);
});

test("footer Contact lands on the support contact block", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/\/support#contact$/);
  await expect(page.locator("#contact")).toBeInViewport();
});

test("locations: every entry is visibly fictional and routes to a support enquiry", async ({ page }) => {
  await page.goto("/locations");
  await expect(page.getByRole("note")).toContainText("fictional");
  const items = page.locator(".location-list li");
  await expect(items).toHaveCount(2);
  for (const li of await items.all()) {
    await expect(li).toContainText("Fictional example");
    await expect(li.getByRole("link", { name: /Ask about service near me/ })).toHaveAttribute("href", "/enquiry?intent=support");
  }
});

test("locations page is noindex while entries are fictional", async ({ request }) => {
  const html = await (await request.get("/locations")).text();
  expect(html).toMatch(/<meta name="robots" content="noindex/);
});

test("support route preselects support intent in the form", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("link", { name: "Contact about this for General repairs" }).click();
  await expect(page.getByLabel(/What would you like help with/)).toHaveValue("support");
});
