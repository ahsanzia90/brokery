import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
for (const [name, opts] of [["desktop", { viewport: { width: 1366, height: 860 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const ctx = await browser.newContext(opts);
  await ctx.addCookies([{ name: "ml_visual", value: "photos", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `screenshots/photo-home-${name}.png`, fullPage: name === "desktop" });
  await page.goto("http://localhost:3000/commodities/rice", { waitUntil: "networkidle" });
  await page.screenshot({ path: `screenshots/photo-rice-${name}.png` });
  await ctx.close();
}
await browser.close();
console.log("ok");
