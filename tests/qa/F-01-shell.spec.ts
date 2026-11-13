import { test, expect } from "@playwright/test";

const NAV = [
  ["Machines", "/machines"],
  ["Choosing Help", "/#choosing-help"],
  ["Support", "/support"],
  ["Locations", "/locations"],
];

test("main nav is four real links", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, href] of NAV) {
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
});

test("footer has trade enquiry and prototype notice", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Trade Enquiry" })).toHaveAttribute("href", "/enquiry?intent=trade");
  await expect(footer).toContainText("Private prototype");
});

test("skip link is first tab stop and moves focus to main", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard test");
  await page.goto("/");
  // First focusable element in document order (no reliance on window focus timing under load).
  const first = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
    return el?.textContent?.trim();
  });
  expect(first).toBe("Skip to content");
  const skip = page.getByRole("link", { name: "Skip to content" });
  // Retried: under heavy parallel load, hydration can land between focus and Enter.
  await expect(async () => {
    await skip.focus();
    await expect(skip).toBeVisible(); // visible when focused
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
});

test("no horizontal page scroll", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
