import { test, expect } from "@playwright/test";
import { normalisePhone, validateEnquiry } from "../../web/lib/enquiry";

test.describe("validation rules (unit)", () => {
  test("phone normalisation", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "098765-43210", "(080) 2345 6789", "91 9876543210"])
      expect(normalisePhone(ok), ok).not.toBeNull();
    for (const bad of ["", "12345", "98765432101234", "abcdefghij", "+1 555 123 4567", "0000000000", "1234567890"])
      expect(normalisePhone(bad), bad).toBeNull();
  });
  test("required fields, limits, unknown model", () => {
    const base = { name: "Asha", phone: "9876543210", intent: "general", model: "", message: "" };
    expect(validateEnquiry(base)).toEqual({});
    expect(Object.keys(validateEnquiry({ ...base, name: " a " }))).toEqual(["name"]);
    expect(Object.keys(validateEnquiry({ ...base, intent: "order" }))).toEqual(["intent"]);
    expect(Object.keys(validateEnquiry({ ...base, model: "not-real" }))).toEqual(["model"]);
    expect(Object.keys(validateEnquiry({ ...base, message: "x".repeat(1001) }))).toEqual(["message"]);
  });
});

test("detail page CTA opens the form with the machine preselected", async ({ page }) => {
  await page.goto("/machines/demo-model-2");
  await page.getByRole("link", { name: "Ask about this machine" }).click();
  await expect(page).toHaveURL(/\/enquiry\?model=demo-model-2$/);
  await expect(page.getByLabel("Machine (optional)")).toHaveValue("demo-model-2");
  await expect(page.getByLabel(/What would you like help with/)).toHaveValue("product");
  await expect(page.locator(".enquiry__summary")).toContainText("Demo model 2");
});

test("trade link preselects trade intent; junk query values are ignored", async ({ page }) => {
  await page.goto("/enquiry?intent=trade");
  await expect(page.getByLabel(/What would you like help with/)).toHaveValue("trade");
  await page.goto("/enquiry?intent=<script>&model=../../etc");
  await expect(page.getByLabel(/What would you like help with/)).toHaveValue("");
  await expect(page.getByLabel("Machine (optional)")).toHaveValue("");
});

test("empty submit shows text errors, focuses the summary, keeps values", async ({ page }) => {
  await page.goto("/enquiry");
  await page.getByLabel("Name (required)").fill("Asha");
  await page.getByRole("button", { name: "Submit simulated enquiry" }).click();
  const summary = page.locator(".error-summary");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Enter a contact number.");
  await expect(summary).toContainText("Choose what you would like help with.");
  await expect(page.getByLabel("Contact number (required)")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name (required)")).toHaveValue("Asha");
  await expect(page.getByLabel("Name (required)")).not.toHaveAttribute("aria-invalid", /.*/);
});

async function fillValid(page: import("@playwright/test").Page) {
  await page.getByLabel("Name (required)").fill("Asha");
  await page.getByLabel("Contact number (required)").fill("98765 43210");
  await page.getByLabel(/What would you like help with/).selectOption("product");
  await page.getByLabel("Machine (optional)").selectOption("stylish-stitcher");
  await page.getByLabel(/Your question/).fill("Can it hem jeans?");
}

test("offline submit fails, keeps every value, Retry succeeds once online", async ({ page, context }) => {
  await page.goto("/enquiry");
  await fillValid(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Submit simulated enquiry" }).click();
  await expect(page.locator(".error-summary")).toContainText("could not be completed");
  await expect(page.locator(".error-summary")).toBeFocused();
  await expect(page.getByLabel("Name (required)")).toHaveValue("Asha");
  await expect(page.getByLabel(/Your question/)).toHaveValue("Can it hem jeans?");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page).toHaveURL(/\/enquiry\/confirmation$/);
});

test("success lands on confirmation with context and no personal data", async ({ page }) => {
  await page.goto("/enquiry");
  await fillValid(page);
  await page.getByRole("button", { name: "Submit simulated enquiry" }).click();
  await expect(page).toHaveURL(/\/enquiry\/confirmation$/);
  await expect(page.locator("h1")).toHaveText("Your Jtech enquiry");
  await expect(page.getByRole("heading", { name: "Simulation complete" })).toBeVisible();
  await expect(page.locator(".confirmation__facts")).toContainText("Machine enquiry");
  await expect(page.locator(".confirmation__facts")).toContainText("Stylish Stitcher");
  const stored = await page.evaluate(() => JSON.stringify(sessionStorage));
  expect(stored).not.toContain("Asha");
  expect(stored).not.toContain("98765");
  expect(page.url()).not.toContain("Asha");
});

test("confirmation opened directly shows the missing-context state", async ({ page }) => {
  await page.goto("/enquiry/confirmation");
  await expect(page.getByText("No confirmation details are available.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to enquiry" })).toHaveAttribute("href", "/enquiry");
  await expect(page.getByText("Simulation complete")).toHaveCount(0);
});

test("enquiry pages are noindex", async ({ request }) => {
  for (const p of ["/enquiry", "/enquiry/confirmation"]) {
    const html = await (await request.get(p)).text();
    expect(html).toMatch(/<meta name="robots" content="noindex/);
  }
});
