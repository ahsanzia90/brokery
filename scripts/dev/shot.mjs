// node scripts/dev/shot.mjs <path> <name> [mobile|desktop|both] [full]
import { chromium, devices } from "@playwright/test";
import { execSync } from "node:child_process";
const [, , path = "/", name = "shot", mode = "both", full = "full"] = process.argv;
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const phone = process.env.SHOT_PHONE;
const cookie = phone ? execSync(`npx tsx scripts/dev-session.ts --phone ${phone}`, { encoding: "utf8" }).match(/ml_session=(\S+)/)[1] : null;
async function go(ctx, suffix) {
  if (cookie) await ctx.addCookies([{ name: "ml_session", value: cookie, domain: "localhost", path: "/" }]);
  if (process.env.SHOT_LANG) await ctx.addCookies([{ name: "ml_lang", value: process.env.SHOT_LANG, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/${name}-${suffix}.png`, fullPage: full === "full" });
  await page.close();
}
if (mode !== "desktop") await go(await browser.newContext({ ...devices["Pixel 7"] }), "mobile");
if (mode !== "mobile") await go(await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 }), "desktop");
await browser.close();
console.log("ok");
