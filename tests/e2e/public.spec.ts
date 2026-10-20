import { expect, test } from "@playwright/test";

test("homepage shows the two main actions and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Aap kya karna chahte hain/i);
  await expect(page.getByRole("heading", { name: /Mujhe maal khareedna hai/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Mujhe apna maal bechna hai/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start buying/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /List your maal/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /Search for a commodity/i }).first()).toBeVisible();
  // no horizontal overflow on a phone
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("urdu switch flips direction to RTL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Menu/i }).click();
  await page.getByRole("button", { name: "اردو" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
});

test("guest can search for rice and open results", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("combobox", { name: /Search for a commodity/i }).first();
  await box.fill("rice");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=rice/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/rice/i);
});

test("admin area is not reachable for guests", async ({ page }) => {
  const res = await page.goto("/admin");
  expect(res?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/login/);
});
