/**
 * Full marketplace workflow in a real (mobile) browser:
 *  1. Seller creates a listing through the 6-step wizard → pending review
 *  2. Admin approves it → visible to guests
 *  3. Buyer posts a buying request for the commodity
 *  4. Seller receives it and sends an offer
 *  5. Buyer sees the offer with the supplier contact
 */
import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

const SELLER = "+923000000002";
const ADMIN = "+923000000001";
const BUYER = "+923000000003";
const TITLE = `E2E Kainat rice ${Date.now()}`;

/** Click Next and wait until the wizard actually shows the following step (retries once if a click landed before hydration). */
async function nextStep(page: Page) {
  const current = Number((await page.getByText(/Step \d of 6/i).first().textContent())?.match(/Step (\d)/)?.[1] ?? "0");
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole("button", { name: /^Next/ }).click();
    try {
      await expect(page.getByText(new RegExp(`Step ${current + 1} of 6`, "i")).first()).toBeVisible({ timeout: 4000 });
      return;
    } catch {}
  }
  throw new Error(`wizard did not advance past step ${current}`);
}

test.describe.serial("listing → approval → RFQ → offer", () => {
  let listingUrl = "";
  let rfqUrl = "";

  test("seller submits a listing via the wizard", async ({ page, context, baseURL }) => {
    await signInAs(context, SELLER, baseURL!);
    await page.goto("/dashboard/seller/listings/new?commodity=rice");
    await expect(page.getByText(/Step 1 of 6|1 \/ 6/i).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Listing title/i).fill(TITLE);
    await nextStep(page);
    await page.getByLabel(/Available quantity/i).fill("500");
    await nextStep(page);
    await page.getByLabel(/Request a quote/i).check();
    await nextStep(page);
    await page.getByLabel(/^Province/i).selectOption({ label: "Punjab" });
    await page.getByLabel(/^City/i).selectOption({ label: "Lahore" });
    await nextStep(page);
    await page.getByLabel(/^Description/i).fill("Fresh crop, ex-mill Lahore. Created by the automated workflow test.");
    await nextStep(page);
    await page.getByRole("button", { name: /Submit listing/i }).click();
    await expect(page.getByText(/Listing submitted|Pending review/i).first()).toBeVisible({ timeout: 20_000 });
    await page.goto("/dashboard/seller/listings?status=pending_review");
    await expect(page.getByText(TITLE)).toBeVisible();
  });

  test("guests cannot see it before approval; admin approves it", async ({ page, context, baseURL }) => {
    const slugRes = await page.request.get(`/search?q=${encodeURIComponent(TITLE)}`);
    const slugPrefix = "/listings/" + TITLE.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    expect((await slugRes.text()).includes(slugPrefix)).toBe(false);

    await signInAs(context, ADMIN, baseURL!);
    await page.goto("/admin/listings?status=pending_review");
    await page.getByRole("link", { name: TITLE }).first().click();
    await page.getByRole("button", { name: /Approve & publish/i }).click();
    await page.getByRole("button", { name: /^Confirm$/ }).click();
    // The toast confirms the server action finished; after a reload the approve button is gone.
    await expect(page.getByText(/^Done$|approved|published/i).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(page.getByRole("button", { name: /Approve & publish/i })).toHaveCount(0);
  });

  test("the approved listing is public", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(TITLE)}`);
    const link = page.getByRole("link", { name: new RegExp(TITLE.slice(0, 20)) }).first();
    await expect(link).toBeVisible({ timeout: 20_000 });
    listingUrl = (await link.getAttribute("href")) ?? listingUrl;
    await page.goto(listingUrl);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(TITLE);
    await expect(page.getByRole("link", { name: /Request a quote/i }).first()).toBeVisible();
  });

  test("buyer posts a buying request for rice", async ({ page, context, baseURL }) => {
    await signInAs(context, BUYER, baseURL!);
    await page.goto("/rfq/new?commodity=rice");
    await page.waitForLoadState("networkidle");
    // units are loaded per commodity; wait until the unit select has a value
    await expect(page.getByLabel(/^Unit/i)).not.toHaveValue("", { timeout: 30_000 });
    await page.getByLabel(/^Quantity/i).fill("2000");
    await page.getByLabel(/^City/i).selectOption({ label: "Lahore" });
    await page.getByLabel(/Any/i).check();
    await page.getByRole("button", { name: /Send request to suppliers/i }).click();
    await expect(page).toHaveURL(/\/rfq\/[0-9a-f-]{36}/, { timeout: 20_000 });
    rfqUrl = new URL(page.url()).pathname;
    await expect(page.getByText(/RFQ-\d{4}-/).first()).toBeVisible();
  });

  test("seller receives the request and sends an offer", async ({ page, context, baseURL }) => {
    await signInAs(context, SELLER, baseURL!);
    await page.goto("/dashboard/seller/enquiries");
    const id = rfqUrl.split("/").pop()!;
    await page.goto(`/dashboard/seller/enquiries/${id}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Your rate/i).fill("9800");
    const unit = page.getByLabel(/per unit|Price unit|Unit/i).first();
    await unit.selectOption({ index: 1 });
    await page.getByLabel(/^Notes/i).fill("Ex-mill Lahore, loading within 2 days.");
    await page.getByRole("button", { name: /Send offer/i }).click();
    await expect(page.getByText(/Offer sent|offer has been sent/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("buyer sees the offer and can contact the supplier", async ({ page, context, baseURL }) => {
    await signInAs(context, BUYER, baseURL!);
    await page.goto(rfqUrl);
    await expect(page.getByText(/9,800/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Ex-mill Lahore/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Call|WhatsApp/i }).first()).toBeVisible();
  });
});
