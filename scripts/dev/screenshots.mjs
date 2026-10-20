// Development helper: capture screenshots of key screens from a running server.
//   node scripts/dev/screenshots.mjs   (needs `npm run db:seed:dev` data)
import { chromium, devices } from "@playwright/test";
import { execSync } from "node:child_process";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const out = "screenshots";
const mint = (phone) => execSync(`npx tsx scripts/dev-session.ts --phone ${phone}`, { encoding: "utf8" }).match(/ml_session=(\S+)/)[1];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function shot(ctx, path, name, full = false) {
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  await page.close();
}
const cookie = (name, value) => ({ name, value, domain: "localhost", path: "/" });

const mobile = await browser.newContext({ ...devices["Pixel 7"] });
await shot(mobile, "/", "01-home-mobile");
await shot(mobile, "/commodities/rice", "02-rice-mobile");
const ur = await browser.newContext({ ...devices["Pixel 7"] });
await ur.addCookies([cookie("ml_lang", "ur")]);
await shot(ur, "/", "03-home-urdu-mobile");

const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await shot(desk, "/", "04-home-desktop", true);
await shot(desk, "/prices", "05-prices-desktop");
await shot(desk, "/listings", "06-listings-desktop");
await shot(desk, "/suppliers", "07-suppliers-desktop");
await shot(desk, "/rfq/new?commodity=rice", "08-rfq-form-desktop");
await shot(desk, "/login", "09-login-desktop");

const seller = await browser.newContext({ ...devices["Pixel 7"] });
await seller.addCookies([cookie("ml_session", mint("+923000000002"))]);
await shot(seller, "/dashboard/seller", "10-seller-dashboard-mobile");
await shot(seller, "/dashboard/seller/listings/new?commodity=rice", "11-listing-wizard-mobile");
await shot(seller, "/dashboard/seller/enquiries", "12-seller-enquiries-mobile");

const admin = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await admin.addCookies([cookie("ml_session", mint("+923000000001"))]);
await shot(admin, "/admin", "13-admin-dashboard", true);
await shot(admin, "/admin/listings", "14-admin-listings");
await shot(admin, "/admin/taxonomy", "15-admin-taxonomy");
await shot(admin, "/admin/prices", "16-admin-prices");
await browser.close();
console.log("done");
