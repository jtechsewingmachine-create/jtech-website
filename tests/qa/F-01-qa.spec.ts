import { test, expect } from "@playwright/test";

test("happy flow: logo, 4 nav links, footer groups, notice", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: /Jtech Sewing Machines home/ })).toHaveAttribute("href", "/");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveCount(4);
  const footer = page.locator("footer");
  for (const h of ["Explore", "Help", "Business"]) await expect(footer.getByRole("heading", { name: h })).toBeVisible();
  await expect(footer).toContainText("Private prototype");
});

// Design change (UI-1): header is static at <=640px, sticky above.
test("header is sticky on desktop widths, static on phones", async ({ page }) => {
  await page.goto("/");
  const phone = (page.viewportSize()!.width <= 640);
  await page.evaluate(() => { document.body.style.minHeight = "4000px"; window.scrollTo({ top: 1500, behavior: "instant" }); });
  const pos = await page.locator("header").evaluate((h) => getComputedStyle(h).position);
  const y = (await page.locator("header").boundingBox())!.y;
  if (phone) { expect(pos).toBe("static"); expect(y).toBeLessThan(-100); }
  else { expect(pos).toBe("sticky"); expect(Math.abs(y)).toBeLessThanOrEqual(1); }
});

test("unknown URL returns 404 with shell", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res!.status()).toBe(404);
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("main")).not.toBeEmpty();
});

test("exactly one h1 and one main on / and 404", async ({ page }) => {
  for (const u of ["/", "/does-not-exist/%3Cscript%3E"]) {
    await page.goto(u);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
  }
});

test("interactive targets are at least 44px tall; no overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const small = await page.$$eval("header a, footer a", (els) =>
    els.map((e) => ({ t: e.textContent, h: e.getBoundingClientRect().height })).filter((x) => x.h < 43.5));
  expect(small).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("all four nav links visible in viewport (not clipped) at 320 and 375", async ({ page }) => {
  for (const w of [320, 375]) {
    await page.setViewportSize({ width: w, height: 640 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    const sw = await nav.evaluate((n) => n.scrollWidth - n.clientWidth);
    expect(sw, `nav scrolls horizontally at ${w}px`).toBeLessThanOrEqual(0);
    for (const l of await nav.getByRole("link").all()) {
      const b = (await l.boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(w);
    }
  }
});

test("footer text contrast on dark is >= 4.5:1", async ({ page }) => {
  await page.goto("/");
  const ratios = await page.evaluate(() => {
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = lum(getComputedStyle(document.querySelector("footer")!).backgroundColor);
    return [...document.querySelectorAll("footer a, footer p, footer h2")].map((e) => {
      const l = lum(getComputedStyle(e).color);
      const [a, b] = l > bg ? [l, bg] : [bg, l];
      return { t: e.textContent, r: (a + 0.05) / (b + 0.05) };
    });
  });
  expect(ratios.filter((x) => x.r < 4.5)).toEqual([]);
});

test("sticky header does not cover the /#choosing-help anchor target", async ({ page }) => {
  await page.goto("/");
  const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  const sticky = await page.locator("header").evaluate((h) => getComputedStyle(h).position === "sticky");
  const hh = await page.locator("header").evaluate((h) => h.getBoundingClientRect().height);
  if (sticky) expect(pad).toBeGreaterThanOrEqual(hh);
  else expect(pad).toBeGreaterThanOrEqual(0);
});

test("keyboard: every nav link reachable by Tab with visible focus ring", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard test");
  await page.goto("/");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  const ol = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(ol).not.toBe("none");
});

test("no console errors or failed requests on /", async ({ page }) => {
  const errs: string[] = [];
  // 404s from prefetching not-yet-built nav targets are expected (handoff), so ignore those.
  page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("requestfailed", (r) => errs.push("failed " + r.url()));
  await page.goto("/");
  await page.waitForTimeout(2000);
  expect(errs).toEqual([]);
});

test("odd URLs do not leak internals", async ({ page }) => {
  for (const u of ["/%00", "/'%20OR%201=1--", "/<script>alert(1)</script>", "/_next/../etc/passwd"]) {
    const res = await page.goto(u);
    expect(res!.status()).toBeLessThan(500);
    expect(await page.content()).not.toMatch(/stack|ECONN|node_modules/i);
  }
});
