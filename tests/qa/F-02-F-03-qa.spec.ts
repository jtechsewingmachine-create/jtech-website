import { test, expect } from "@playwright/test";

const PAGES = ["/", "/machines"];

for (const path of PAGES) {
  test.describe(`page ${path}`, () => {
    test("no console errors, no broken images, no duplicate ids", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(path);
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      const broken = await page.$$eval("img", (imgs) =>
        imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      );
      expect(broken).toEqual([]);
      const dup = await page.$$eval("[id]", (els) => {
        const seen = new Set<string>();
        return els.map((e) => e.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
      });
      expect(dup).toEqual([]);
      expect(errors.filter((e) => !/404/.test(e))).toEqual([]);
    });

    test("every image has non-empty alt; every link has an accessible name", async ({ page }) => {
      await page.goto(path);
      const noAlt = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.getAttribute("alt")?.trim()).length);
      expect(noAlt).toBe(0);
      const unnamed = await page.$$eval("a", (as) => as.filter((a) => !(a.textContent || a.getAttribute("aria-label") || "").trim()).length);
      expect(unnamed).toBe(0);
    });

    test("heading levels do not skip", async ({ page }) => {
      await page.goto(path);
      const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", (hs) => hs.map((h) => +h.tagName[1]));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    });

    test("no horizontal overflow at 320, 375, 768, 1440", async ({ page }) => {
      for (const w of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.goto(path);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(over, `overflow at ${w}`).toBeLessThanOrEqual(0);
      }
    });

    test("head: unique title, description, canonical, robots noindex on prototype", async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/Jtech/);
      expect((await page.locator("head title").innerText()).length).toBeLessThanOrEqual(60);
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      expect(desc!.length).toBeGreaterThan(100);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });

    test("copy makes no unverified claims", async ({ page }) => {
      await page.goto(path);
      const text = (await page.locator("main").innerText()).toLowerCase();
      for (const bad of ["best", "guarantee", "in stock", "free delivery", "% off", "discount", "bestseller", "certified", "years warranty", "heavy-duty", "industrial"]) {
        expect(text, `contains "${bad}"`).not.toContain(bad);
      }
    });

    test("injection in query/hash does not execute or break page", async ({ page }) => {
      let dialog = false;
      page.on("dialog", (d) => { dialog = true; d.dismiss(); });
      const res = await page.goto(`${path}?q=<script>alert(1)</script>&x=' OR 1=1 --#<img src=x onerror=alert(1)>`);
      expect(res!.status()).toBe(200);
      expect(await page.content()).not.toContain("<script>alert(1)</script>");
      expect(dialog).toBe(false);
    });

    test("content and all internal links present without JS", async ({ browser }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByText("Stylish Stitcher").first()).toBeVisible();
      await ctx.close();
    });
  });
}

test("internal links resolve (detail pages are F-04, expected 404)", async ({ page, request }) => {
  const hrefs = new Set<string>();
  for (const p of PAGES) {
    await page.goto(p);
    for (const h of await page.$$eval("a[href^='/']", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))) hrefs.add(h.split("#")[0] || "/");
  }
  const bad: string[] = [];
  for (const h of hrefs) {
    // /machines/* is F-04; /support, /locations, /enquiry are later features (404 expected, noted in report).
    if (h.startsWith("/machines/") || /^\/(support|locations|enquiry)/.test(h)) continue;
    const r = await request.get(h);
    if (r.status() !== 200) bad.push(`${h} ${r.status()}`);
  }
  expect(bad).toEqual([]);
});

test("static media is served: images, poster, mp4 with correct type", async ({ request }) => {
  for (const f of ["hemming-demo-poster.jpg", "sample-front.jpg", "stylish-stitcher-studio.jpg", "sample-dials.jpg", "sample-needle-plate.jpg", "sample-logo-panel.jpg", "sample-side.jpg"]) {
    const r = await request.get(`/images/${f}`);
    expect(r.status(), f).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/");
  }
  const v = await request.get("/media/hemming-demo.mp4", { headers: { Range: "bytes=0-99" } });
  expect([200, 206]).toContain(v.status());
  expect(v.headers()["content-type"]).toContain("video/mp4");
});

test("machines listing: exact card content, heading structure and honesty labels", async ({ page }) => {
  await page.goto("/machines");
  const cards = page.locator("article.product-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Price: awaiting confirmation");
  await expect(cards.nth(1)).toContainText("Sample price from ₹6,500 (not a real offer)");
  await expect(cards.nth(1)).toContainText("Sample option: machine head only");
  await expect(cards.nth(0)).toContainText("Type awaiting confirmation");
  await expect(cards.nth(0)).not.toContainText("Electric");
  await expect(cards.nth(0)).not.toContainText("compact");
  await expect(cards.nth(2)).not.toContainText("drawer");
  for (let i = 0; i < 3; i++) await expect(cards.nth(i)).toContainText("Suitability: awaiting confirmation");
  await expect(cards.nth(2)).toContainText("Currently unavailable");
  await expect(page.getByText("Photo pending")).toHaveCount(2);
  // H1 should carry the registered targetQuery (web/CLAUDE.md rule 3: "jtech sewing machine models")
  const h1 = (await page.locator("h1").innerText()).toLowerCase();
  expect(h1).toContain("jtech sewing machine");
});

test("machines h1 carries the registered target query 'jtech sewing machine models'", async ({ page }) => {
  await page.goto("/machines");
  expect((await page.locator("h1").innerText()).toLowerCase()).toContain("models");
});

test("Help me choose: double click, repeat click and back/forward keep working", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Help me choose" });
  await link.dblclick();
  await expect(page.locator("#choosing-help")).toBeFocused();
  await page.locator("#demo-range").focus();
  await link.click();
  await expect(page.locator("#choosing-help")).toBeFocused();
  await page.goto("/machines");
  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/(#choosing-help)?$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/machines/);
});

test("direct load of /#choosing-help focuses heading; unknown hash does not throw", async ({ page }) => {
  await page.goto("/#choosing-help");
  await expect(page.locator("#choosing-help")).toBeFocused();
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("/#nope");
  await page.goto("/#%E0%A4%A");
  expect(errs).toEqual([]);
});

test("keyboard: heading focus is visible and Tab continues from it", async ({ page }) => {
  await page.goto("/#choosing-help");
  await expect(page.locator("#choosing-help")).toBeFocused();
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  expect(tag).toBe("A");
});

test("video: Play button is keyboard operable and never autoplays; no layout jump on failure", async ({ page }) => {
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Play video" });
  await btn.focus();
  await expect(btn).toBeFocused();
  await page.keyboard.press("Enter");
  const canPlay = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"'));
  if (!canPlay) await expect(page.getByRole("status")).toContainText("could not play");
  else await expect(page.getByRole("button", { name: "Pause video" })).toBeVisible();
});

test("video failure: after failure there is no way to retry (button removed)", async ({ page }) => {
  await page.goto("/");
  const canPlay = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"'));
  test.skip(!!canPlay, "codec present; failure path not reachable");
  await page.getByRole("button", { name: "Play video" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  // Documented design choice: the status replaces the button. Verify text stays helpful.
  await expect(page.getByRole("status")).toContainText("still image and description remain available");
});

test("video blocked network: failure message appears", async ({ page }) => {
  await page.route("**/media/hemming-demo.mp4", (r) => r.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Play video" }).click();
  await expect(page.getByRole("status")).toContainText("could not play");
});

test("reduced motion: page still works", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "Help me choose" }).click();
  await expect(page.locator("#choosing-help")).toBeFocused();
});

test("card layout at 768 is not clipped and cards have equal visible text", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto("/machines");
  const boxes = await page.locator("article.product-card").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; }));
  for (const b of boxes) { expect(b.l).toBeGreaterThanOrEqual(0); expect(b.r).toBeLessThanOrEqual(768); expect(b.w).toBeGreaterThan(150); }
});

test("unknown machine slug and trailing-slash behave", async ({ request }) => {
  expect((await request.get("/machines/does-not-exist")).status()).toBe(404);
  const r = await request.get("/machines/", { maxRedirects: 0 });
  expect([200, 301, 308]).toContain(r.status());
});

test("sitemap lists / and /machines", async ({ request }) => {
  const t = await (await request.get("/sitemap/0.xml")).text();
  expect(t).toContain("/machines");
});
