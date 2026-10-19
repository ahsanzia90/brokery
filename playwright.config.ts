import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against an already running server (default http://localhost:3000)
 * seeded with `npm run db:seed && npm run db:seed:dev`. Set E2E_BASE_URL to override.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
    // Use the pre-installed Chromium when the exact Playwright build is not present.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
});
