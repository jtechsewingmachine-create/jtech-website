import { test, expect, type Page } from "@playwright/test";

async function fillValid(page: Page) {
  await page.goto("/enquiry?model=demo-model-2");
  await page.getByLabel("Name (required)").fill("Asha");
  await page.getByLabel("Contact number (required)").fill("98765 43210");
}

test("end to end: form posts to the Go API through the proxy and confirms", async ({ page }) => {
  await fillValid(page);
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith("/api/enquiries") && r.method() === "POST"),
    page.getByRole("button", { name: "Send enquiry" }).click(),
  ]);
  expect(new URL(req.url()).origin).toBe(new URL(page.url()).origin); // same-origin, no CORS
  const body = req.postDataJSON();
  expect(body).toMatchObject({ name: "Asha", phone: "98765 43210", intent: "product", model: "demo-model-2", website: "" });
  await expect(page).toHaveURL(/\/enquiry\/confirmation$/);
  await expect(page.getByRole("heading", { name: "Enquiry sent" })).toBeVisible();
});

test("proxy rejects bad input at the API with field errors", async ({ request }) => {
  const res = await request.post("/api/enquiries", { data: { name: "a", phone: "1", intent: "x" } });
  expect(res.status()).toBe(400);
  expect(Object.keys((await res.json()).errors).sort()).toEqual(["intent", "name", "phone"]);
});

test("server-side field errors are shown on the form", async ({ page }) => {
  await page.route("**/api/enquiries", (r) =>
    r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ errors: { phone: "Enter a 10-digit phone number, for example 98765 43210." } }) }),
  );
  await fillValid(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".error-summary")).toBeFocused();
  await expect(page.getByLabel("Contact number (required)")).toHaveAttribute("aria-invalid", "true");
});

test("429 shows the rate-limit message and keeps values", async ({ page }) => {
  await page.route("**/api/enquiries", (r) => r.fulfill({ status: 429, headers: { "Retry-After": "600" }, body: "{}" }));
  await fillValid(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".error-summary")).toContainText("Too many enquiries");
  await expect(page.getByLabel("Name (required)")).toHaveValue("Asha");
});

test("503 from the API shows the failure state with Retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/enquiries", (r) => {
    if (r.request().method() !== "POST") return r.fulfill({ status: 204 }); // page-load warm-up ping
    calls++;
    return calls === 1
      ? r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"x"}' })
      : r.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true}' });
  });
  await fillValid(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".error-summary")).toContainText("could not be sent");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page).toHaveURL(/\/enquiry\/confirmation$/);
});

test("honeypot is invisible to people and assistive tech", async ({ page }) => {
  await page.goto("/enquiry");
  const hp = page.locator("#website");
  await expect(hp).toHaveAttribute("tabindex", "-1");
  expect(await page.locator(".hp").getAttribute("aria-hidden")).toBe("true");
  expect(await hp.boundingBox().then((b) => (b ? b.x + b.width : 0))).toBeLessThan(0);
});

test("the Go API refuses direct calls that bypass the site (no proxy secret)", async ({ request }) => {
  const res = await request.post("http://127.0.0.1:8090/api/enquiries", {
    headers: { "X-Forwarded-For": "198.51.100.1", "X-Client-IP": "198.51.100.1" },
    data: { name: "Asha", phone: "9876543210", intent: "general" },
  });
  expect(res.status()).toBe(403);
});

test("warm-up: the enquiry page pings the API on load and GET answers 204", async ({ page, request }) => {
  const ping = page.waitForRequest((r) => r.url().endsWith("/api/enquiries") && r.method() === "GET");
  await page.goto("/enquiry");
  await ping;
  expect((await request.get("/api/enquiries")).status()).toBe(204);
});
