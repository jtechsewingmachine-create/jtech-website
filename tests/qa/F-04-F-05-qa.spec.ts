import { test, expect, type Page } from "@playwright/test";
import { normalisePhone, validateEnquiry } from "../../web/lib/enquiry";

const KEY = "jtech-enquiry-confirmation";
const NAME = "Name (required)";
const PHONE = "Contact number (required)";
const INTENT = /What would you like help with/;
// Next renders its own route announcer (role=alert); scope to the form's summaries.
const summary = (p: Page) => p.locator(".error-summary");
const submitBtn = (p: Page) => p.locator("form button[type=submit]").last();

async function fillOk(p: Page, name = "Asha Rao", phone = "98765 43210") {
  await p.getByLabel(NAME).fill(name);
  await p.getByLabel(PHONE).fill(phone);
  await p.getByLabel(INTENT).selectOption("general");
}

test.describe("unit: validation edge cases", () => {
  const base = { name: "Asha", phone: "9876543210", intent: "general", model: "", message: "" };
  test("phone", () => {
    for (const ok of ["+91-98765-43210", "0 9876543210".replace(" ", ""), "(98765) 43210", "98765.43210"])
      expect(normalisePhone(ok), ok).not.toBeNull();
    // Fullwidth / Devanagari digits, letters, extra prefix, too short/long must be rejected.
    for (const bad of ["９８７６５４３２１０", "९८७६५४३२१०", "98765 4321a", "+91 +91 9876543210", "987654321", "+9198765432101", "0000000000x"])
      expect(normalisePhone(bad), bad).toBeNull();
  });
  test("QA-U1 phone accepts numbers that cannot be Indian mobiles (leading 0-5)", () => {
    expect(normalisePhone("0000000000")).toBeNull();
    expect(normalisePhone("1234567890")).toBeNull();
  });
  test("name boundaries", () => {
    expect(validateEnquiry({ ...base, name: "ab" })).toEqual({});
    expect(validateEnquiry({ ...base, name: "a" }).name).toBeTruthy();
    expect(validateEnquiry({ ...base, name: "   " }).name).toBeTruthy();
    expect(validateEnquiry({ ...base, name: "x".repeat(80) })).toEqual({});
    expect(validateEnquiry({ ...base, name: "x".repeat(81) }).name).toBeTruthy();
    expect(validateEnquiry({ ...base, name: "आशा राव" })).toEqual({});
  });
  test("QA-U2 limits count characters, not UTF-16 units (emoji)", () => {
    expect(validateEnquiry({ ...base, name: "😀".repeat(80) })).toEqual({});
    expect(validateEnquiry({ ...base, message: "😀".repeat(1000) })).toEqual({});
  });
  test("message boundaries and intent/model tampering", () => {
    expect(validateEnquiry({ ...base, message: "x".repeat(1000) })).toEqual({});
    expect(validateEnquiry({ ...base, message: "x".repeat(1001) }).message).toBeTruthy();
    for (const m of ["__proto__", "constructor", "toString", "DEMO-MODEL-2", " demo-model-2"])
      expect(validateEnquiry({ ...base, model: m }).model, m).toBeTruthy();
    for (const i of ["", "__proto__", "GENERAL", "order"])
      expect(validateEnquiry({ ...base, intent: i }).intent, i).toBeTruthy();
  });
});

test.describe("form behaviour", () => {
  test("happy flow end to end", async ({ page }) => {
    await page.goto("/machines/demo-model-2");
    await page.getByRole("link", { name: "Ask about this machine" }).click();
    await page.getByLabel(NAME).fill("Asha Rao");
    await page.getByLabel(PHONE).fill("98765 43210");
    await submitBtn(page).click();
    await expect(submitBtn(page)).toHaveText("Sending…");
    await expect(page).toHaveURL(/\/enquiry\/confirmation$/);
    await expect(page.locator("dl")).toContainText("Machine enquiry");
    await expect(page.locator("dl")).toContainText("Demo model 2");
    await expect(page.locator("body")).not.toContainText("Asha");
    await expect(page.locator("body")).not.toContainText("98765");
  });

  test("injection / unicode strings are inert and never reach the confirmation page", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
    await page.goto("/enquiry");
    await fillOk(page, `<script>alert(1)</script>'; DROP TABLE x; -- 😀`, "98765 43210");
    await page.getByLabel(/Your question/).fill(`<img src=x onerror=alert(2)> ' OR 1=1 -- {{7*7}} \${7*7} ‮ RTL`);
    await submitBtn(page).click();
    await expect(page).toHaveURL(/confirmation$/);
    await expect(page.locator("body")).not.toContainText("DROP TABLE");
    expect(dialogs).toEqual([]);
  });

  test("whitespace-only name and bad phone show text errors; fixing clears them", async ({ page }) => {
    await page.goto("/enquiry");
    await page.getByLabel(NAME).fill("     ");
    await page.getByLabel(PHONE).fill("12ab");
    await page.getByLabel(INTENT).selectOption("trade");
    await submitBtn(page).click();
    await expect(summary(page)).toBeFocused();
    await expect(page.locator("#name-error")).toBeVisible();
    await expect(page.locator("#phone-error")).toBeVisible();
    await expect(page.getByLabel(PHONE)).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel(NAME).fill("Ravi");
    await page.getByLabel(PHONE).fill("9876543210");
    await submitBtn(page).click();
    await expect(page).toHaveURL(/confirmation$/);
  });

  test("name over 80 chars: input allows up to 100, error shown, values kept", async ({ page }) => {
    await page.goto("/enquiry");
    await fillOk(page, "n".repeat(120));
    expect(await page.getByLabel(NAME).inputValue()).toHaveLength(100);
    await submitBtn(page).click();
    await expect(page.locator("#name-error")).toContainText("80 characters");
    await expect(page.getByLabel(PHONE)).toHaveValue("98765 43210");
  });

  test("message 1001 chars rejected with count; 1000 accepted", async ({ page }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    await page.getByLabel(/Your question/).fill("x".repeat(1001));
    await submitBtn(page).click();
    await expect(page.locator("#message-error")).toContainText("1001");
    await page.getByLabel(/Your question/).fill("x".repeat(1000));
    await submitBtn(page).click();
    await expect(page).toHaveURL(/confirmation$/);
  });

  test("double click and Enter-spam submit once", async ({ page }) => {
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem;
      (window as any).__sets = 0;
      Storage.prototype.setItem = function (k: string, v: string) { (window as any).__sets++; return orig.call(this, k, v); };
    });
    await page.goto("/enquiry");
    await fillOk(page);
    await submitBtn(page).dblclick();
    await page.getByLabel(NAME).press("Enter").catch(() => {});
    await expect(page).toHaveURL(/confirmation$/);
    // storage written once means a single submission completed
    expect(await page.evaluate(() => (window as any).__sets)).toBeLessThanOrEqual(1);
  });

  test("Enter key in a text field submits", async ({ page }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    await page.getByLabel(PHONE).press("Enter");
    await expect(page).toHaveURL(/confirmation$/);
  });

  test("offline: failure state keeps values, Retry works once online, focus on alert", async ({ page, context }) => {
    await page.goto("/enquiry?model=demo-model-2");
    await fillOk(page, "Asha Rao", "98765 43210");
    await page.getByLabel(/Your question/).fill("hello 😀");
    await context.setOffline(true);
    await submitBtn(page).click();
    await expect(page.getByText("The enquiry could not be sent")).toBeVisible();
    await expect(summary(page)).toBeFocused();
    await expect(page.getByLabel(NAME)).toHaveValue("Asha Rao");
    await expect(page.getByLabel(/Your question/)).toHaveValue("hello 😀");
    await expect(page.getByLabel("Machine (optional)")).toHaveValue("demo-model-2");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("The enquiry could not be sent")).toBeVisible(); // still offline
    await context.setOffline(false);
    await expect(async () => {
      await page.getByRole("button", { name: "Retry" }).click({ timeout: 2000 });
      await expect(page).toHaveURL(/confirmation$/, { timeout: 4000 });
    }).toPass({ timeout: 20000 });
  });

  test("NUL / control characters in the message are rejected inline, never sent", async ({ page }) => {
    let posts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/enquiries")) posts++; });
    await page.goto("/enquiry");
    await fillOk(page);
    await page.getByLabel(/Your question/).fill("bad \u0000 char");
    await submitBtn(page).click();
    await expect(summary(page)).toBeFocused();
    await expect(page).not.toHaveURL(/confirmation$/);
    expect(posts).toBe(0);
  });

  test("offline then invalid edit: stale failure banner does not linger beside validation errors", async ({ page, context }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    await context.setOffline(true);
    await submitBtn(page).click();
    await expect(page.getByText("The enquiry could not be sent")).toBeVisible();
    await page.getByLabel(PHONE).fill("1");
    await submitBtn(page).click();
    await expect(page.getByText("The enquiry could not be sent")).toHaveCount(0);
    await context.setOffline(false);
  });

  test("going offline during the Sending state still fails cleanly", async ({ page, context }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    // The real API answers in ms, so hold the request in flight to make "offline mid-send" deterministic.
    await page.route("**/api/enquiries", async (r) => { await new Promise((x) => setTimeout(x, 800)); await r.abort("internetdisconnected"); });
    await submitBtn(page).click();
    await context.setOffline(true);
    await expect(page.getByText("The enquiry could not be sent")).toBeVisible();
    await context.setOffline(false);
  });

  test("browser back from confirmation gives a usable form; forward restores confirmation", async ({ page }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    await submitBtn(page).click();
    await expect(page).toHaveURL(/confirmation$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/enquiry$/);
    await expect(submitBtn(page)).toBeEnabled();
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Context is consumed on first read (CR-3): a reload shows the missing-context state.
    await page.reload();
    await expect(page.getByText("No confirmation details are available.")).toBeVisible();
  });

  test("QA-R2-1 second enquiry in the same tab shows its own context, not the first one", async ({ page }) => {
    await page.goto("/enquiry?model=demo-model-2");
    await fillOk(page);
    await page.getByLabel(INTENT).selectOption("product");
    await submitBtn(page).click();
    await expect(page.locator("dl")).toContainText("Demo model 2");
    await page.getByRole("link", { name: "Continue browsing" }).click(); // client-side navigation
    await expect(page).toHaveURL(/\/machines$/);
    await page.locator('a[href="/enquiry?intent=trade"]').first().click();
    await expect(page.getByLabel(INTENT)).toHaveValue("trade");
    await fillOk(page);
    await page.getByLabel(INTENT).selectOption("trade");
    await submitBtn(page).click();
    await expect(page.locator("dl")).toContainText("Trade enquiry");
    await expect(page.locator("dl")).not.toContainText("Demo model 2");
  });

  test("refresh mid-form loses typed values but the page still works", async ({ page }) => {
    await page.goto("/enquiry");
    await fillOk(page);
    await page.reload();
    await expect(submitBtn(page)).toBeEnabled();
    await fillOk(page);
    await submitBtn(page).click();
    await expect(page).toHaveURL(/confirmation$/);
  });

  test("two tabs: each tab keeps its own context", async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto("/enquiry?model=demo-model-2");
    await b.goto("/enquiry?intent=trade");
    await fillOk(a);
    await a.getByLabel(INTENT).selectOption("product");
    await submitBtn(a).click();
    await expect(a.locator("dl")).toContainText("Demo model 2");
    await expect(b.getByLabel(INTENT)).toHaveValue("trade");
    await fillOk(b);
    await b.getByLabel(INTENT).selectOption("trade");
    await submitBtn(b).click();
    await expect(b.locator("dl")).toContainText("Trade enquiry");
    await expect(a.locator("dl")).toContainText("Machine enquiry");
  });

  test("QA-F1 JS disabled: submit is disabled and nothing reaches the URL", async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const p = await ctx.newPage();
    await p.goto("/enquiry");
    await p.locator("#name").fill("Private Person");
    await p.locator("#phone").fill("9876543210");
    await expect(p.locator("form button[type=submit]")).toBeDisabled();
    await p.locator("#phone").press("Enter");
    await p.waitForLoadState();
    expect(p.url()).not.toContain("9876543210");
    expect(p.url()).not.toContain("Private");
    await ctx.close();
  });
});

test.describe("tampered input", () => {
  const cases: [string, string, string][] = [
    ["/enquiry?model=DEMO-MODEL-2", "", ""],
    ["/enquiry?model=demo-model-2&model=stylish-stitcher", "demo-model-2", "product"],
    ["/enquiry?model[]=x", "", ""],
    ["/enquiry?model=__proto__&intent=constructor", "", ""],
    ["/enquiry?intent=support&model=demo-model-3", "demo-model-3", "support"],
    ["/enquiry?intent=trade&model=%00", "", "trade"],
    ["/enquiry?intent=TRADE", "", ""],
    [`/enquiry?model=${"a".repeat(5000)}`, "", ""],
    ["/enquiry?model=%E0%A4%A", "", ""],
  ];
  for (const [url, model, intent] of cases)
    test(`query ${url.slice(0, 60)}`, async ({ page }) => {
      const r = await page.goto(url);
      expect(r?.status()).toBeLessThan(500);
      await expect(page.getByLabel("Machine (optional)")).toHaveValue(model);
      await expect(page.getByLabel(INTENT)).toHaveValue(intent);
    });

  test("tampered sessionStorage context renders as text and does not crash", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
    await page.goto("/enquiry/confirmation");
    for (const raw of [
      JSON.stringify({ intentLabel: "<img src=x onerror=alert(1)>", modelName: "<script>alert(2)</script>" }),
      "not json", "null", "[]", "42", JSON.stringify({ intentLabel: 5 }), JSON.stringify({ intentLabel: "x".repeat(100000), modelName: {} }),
    ]) {
      await page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [KEY, raw]);
      await page.reload();
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("dl, .empty-state").first()).toBeVisible();
    }
    expect(dialogs).toEqual([]);
  });

  test("confirmation direct visit shows missing-context state", async ({ page }) => {
    await page.goto("/enquiry/confirmation");
    await expect(page.getByText("No confirmation details are available.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to enquiry" })).toHaveAttribute("href", "/enquiry");
  });

  test("confirmation is noindex and not in sitemap", async ({ page, request }) => {
    await page.goto("/enquiry/confirmation");
    await expect(page.locator('meta[name=robots]')).toHaveAttribute("content", /noindex/);
    const sm = await (await request.get("/sitemap.xml")).text();
    expect(sm).not.toContain("/enquiry");
  });
});

test.describe("detail pages", () => {
  for (const slug of ["stylish-stitcher", "demo-model-2", "demo-model-3"])
    test(`${slug}: one h1, breadcrumb JSON-LD valid, CTA to enquiry`, async ({ page }) => {
      expect((await page.goto(`/machines/${slug}`))?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      const crumbs = ld.map((t) => JSON.parse(t)).find((j) => j["@type"] === "BreadcrumbList");
      expect(crumbs.itemListElement).toHaveLength(3);
      const cta = page.getByRole("link", { name: /Ask about/ }).first();
      await expect(cta).toHaveAttribute("href", new RegExp(`/enquiry\\?model=${slug}$`));
      const hs = await page.locator("main h1, main h2, main h3").evaluateAll((els) => els.map((e) => +e.tagName[1]));
      hs.reduce((prev, h) => { expect(h - prev).toBeLessThanOrEqual(1); return h; }, 1);
    });

  test("demo-model-3 is flagged unavailable and CTA says availability", async ({ page }) => {
    await page.goto("/machines/demo-model-3");
    await expect(page.getByText("Currently unavailable").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ask about availability" }).first()).toBeVisible();
  });

  for (const bad of ["/machines/nope", "/machines/stylish-stitcher/", "/machines/__proto__", "/machines/demo-model-2%00", "/machines/a%20b"])
    test(`unknown slug ${bad} is not a 5xx`, async ({ request }) => {
      const r = await request.get(bad, { maxRedirects: 0 });
      expect([200, 308, 404]).toContain(r.status());
      if (bad !== "/machines/stylish-stitcher/") expect(r.status()).toBe(404);
    });

  test("QA-D1 case variants 301 to lowercase, before and after the real page was requested", async ({ request }) => {
    for (let i = 0; i < 2; i++) {
      const r = await request.get("/machines/Stylish-Stitcher", { maxRedirects: 0 });
      expect(r.status()).toBe(301);
      expect(r.headers()["location"]).toMatch(/\/machines\/stylish-stitcher$/);
      expect((await request.get("/machines/stylish-stitcher")).status()).toBe(200);
    }
    const q = await request.get("/Machines/DEMO-MODEL-2?x=A", { maxRedirects: 0 });
    expect(q.status()).toBe(301);
    expect(q.headers()["location"]).toMatch(/\/machines\/demo-model-2\?x=A$/);
    expect((await request.get("/machines/NOPE", { maxRedirects: 0 })).status()).toBe(301);
  });

  test("unknown slug 404 page has no leaked internals", async ({ request }) => {
    const t = await (await request.get("/machines/nope")).text();
    expect(t).not.toMatch(/NoFallbackError|at \w+ \(|node_modules|\/Users\//);
  });
});
