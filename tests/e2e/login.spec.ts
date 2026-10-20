import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { latestOtpFromLog } from "./helpers";

const LOG = process.env.DEV_SERVER_LOG ?? "/tmp/claude-0/-home-user-brokery/079c3935-7c13-51b6-8642-7ec6297264b7/scratchpad/dev.log";
const SUFFIX = String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
const PHONE = `+92300${SUFFIX}`;
const LOCAL = `0300 ${SUFFIX}`;

test("phone OTP sign-in creates an account and asks for a profile", async ({ page }) => {
  test.skip(!existsSync(LOG), "needs the dev server log to read the console OTP");
  await page.goto("/login");
  await page.getByLabel(/Mobile number/i).fill(LOCAL);
  await page.getByRole("button", { name: /Send code/i }).click();
  await expect(page.getByText(/Code sent to/i)).toBeVisible();
  // small wait for the log to flush
  await page.waitForTimeout(800);
  const code = latestOtpFromLog(LOG, PHONE);
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel(/6-digit code 1$/i).fill(code!); // six boxes; typing all digits into the first spreads them
  await page.getByRole("button", { name: /^Verify$/i }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/^Name/i).fill("Test Buyer");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 20_000 });
});

test("wrong OTP shows remaining attempts", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Mobile number/i).fill(`0301 ${SUFFIX}`);
  await page.getByRole("button", { name: /Send code/i }).click();
  await expect(page.getByText(/Code sent to/i)).toBeVisible();
  await page.getByLabel(/6-digit code 1$/i).fill("000000");
  await page.getByRole("button", { name: /^Verify$/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /attempts left|not correct/i })).toBeVisible();
});
