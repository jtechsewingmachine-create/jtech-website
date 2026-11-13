import { test, expect } from "@playwright/test";

const SLUGS = ["stylish-stitcher", "demo-model-2", "demo-model-3"];

for (const slug of SLUGS) {
  test(`detail ${slug}: one h1, breadcrumb, enquiry link carries the model`, async ({ page }) => {
    const res = await page.goto(`/machines/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(crumbs.getByRole("link", { name: "Machines" })).toHaveAttribute("href", "/machines");
    await expect(crumbs.locator('[aria-current="page"]')).toHaveCount(1);
    const cta = page.locator(".detail-top__actions .btn--primary");
    await expect(cta).toHaveAttribute("href", `/enquiry?model=${slug}`);
    // Other models only, never itself.
    await expect(page.locator(`#others ~ * a[href="/machines/${slug}"]`)).toHaveCount(0);
  });
}

test("unknown model returns 404", async ({ request }) => {
  expect((await request.get("/machines/not-a-model")).status()).toBe(404);
});

test("unavailable model says so and changes the action label", async ({ page }) => {
  await page.goto("/machines/demo-model-3");
  await expect(page.getByRole("note")).toContainText("Currently unavailable");
  await expect(page.getByRole("link", { name: "Ask about availability" })).toBeVisible();
});

test("package options list contents and labelled sample prices", async ({ page }) => {
  await page.goto("/machines/demo-model-2");
  const configs = page.locator(".configs li");
  await expect(configs).toHaveCount(2);
  for (const c of await configs.all()) await expect(c).toContainText("not a real offer");
  await expect(configs.nth(0)).toContainText("Head only");
  await expect(configs.nth(1)).toContainText("Package");
});

test("breadcrumb JSON-LD matches the visible trail and no Product schema is claimed", async ({ request }) => {
  const html = await (await request.get("/machines/stylish-stitcher")).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const crumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
  expect(crumb.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Jtech Sewing Machines", "Machines", "Stylish Stitcher"]);
  expect(html).not.toContain('"@type":"Product"');
});

test("unknown specs render as awaiting confirmation, not blank", async ({ page }) => {
  await page.goto("/machines/stylish-stitcher");
  await expect(page.locator(".facts dd.pending").first()).toHaveText("Awaiting confirmation");
  await expect(page.locator(".facts dd:empty")).toHaveCount(0);
});
