/**
 * Acceptance criteria 10 & 11: a seller cannot modify another seller's listings and a
 * buyer cannot modify another buyer's requests. Runs against TEST_DATABASE_URL with the
 * seeded taxonomy; creates its own users/businesses and removes them afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

const { db, pool } = await import("@/db");
const { profiles, businesses, businessCommodities, listings, rfqs, commodities, units, locations, userRoles } = await import("@/db/schema");
const { createListing, updateListing, setListingStatus } = await import("@/lib/listings/service");
const { createRfq, closeRfq, cancelRfq } = await import("@/lib/rfq/service");
const { getRfqForBuyer } = await import("@/lib/rfq/queries");
const { sendQuote } = await import("@/lib/business/quote-service");

const users: string[] = [];
let sellerA = "", sellerB = "", buyerC = "", buyerD = "";
let bizA = "", bizB = "";
let rice = "", kg = "", lahore = "";

async function mkUser(phone: string, name: string) {
  const [u] = await db.insert(profiles).values({ phone, name, isSeller: true }).returning();
  await db.insert(userRoles).values([{ userId: u.id, role: "buyer" }, { userId: u.id, role: "seller" }]);
  users.push(u.id);
  return u.id;
}
async function mkBiz(ownerId: string, name: string) {
  const [b] = await db.insert(businesses).values({ ownerId, name, slug: name.toLowerCase().replace(/\W+/g, "-") + "-" + Date.now(), verificationLevel: "phone_verified" }).returning();
  await db.insert(businessCommodities).values({ businessId: b.id, commodityId: rice });
  return b.id;
}

beforeAll(async () => {
  const ts = Date.now().toString().slice(-6);
  [rice, kg, lahore] = await Promise.all([
    db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, "rice")).then((r) => r[0].id),
    db.select({ id: units.id }).from(units).where(eq(units.code, "kg")).then((r) => r[0].id),
    db.select({ id: locations.id }).from(locations).where(eq(locations.path, "punjab/lahore")).then((r) => r[0].id),
  ]);
  sellerA = await mkUser(`+92311${ts}1`, "Seller A");
  sellerB = await mkUser(`+92311${ts}2`, "Seller B");
  buyerC = await mkUser(`+92311${ts}3`, "Buyer C");
  buyerD = await mkUser(`+92311${ts}4`, "Buyer D");
  bizA = await mkBiz(sellerA, "Test Traders A");
  bizB = await mkBiz(sellerB, "Test Traders B");
});

afterAll(async () => {
  await db.delete(listings).where(inArray(listings.businessId, [bizA, bizB]));
  await db.delete(rfqs).where(inArray(rfqs.buyerId, [buyerC, buyerD]));
  await db.delete(businesses).where(inArray(businesses.id, [bizA, bizB]));
  await db.delete(profiles).where(inArray(profiles.id, users));
  await pool.end();
});

describe("listing ownership", () => {
  let listingId = "";
  it("seller A creates a listing", async () => {
    const res = await createListing({ userId: sellerA, businessId: bizA }, { commodityId: rice, title: "Ownership test rice", quantity: "500", unitId: kg, priceType: "quote", cityId: lahore, submit: true } as never);
    expect(res.ok).toBe(true);
    listingId = res.ok ? (res.data as { listingId: string }).listingId : "";
    expect(listingId).toBeTruthy();
  });
  it("seller B cannot edit, pause or remove seller A's listing", async () => {
    const upd = await updateListing({ userId: sellerB, businessId: bizB }, listingId, { commodityId: rice, title: "Hijacked", quantity: "1", unitId: kg, priceType: "quote" } as never);
    expect(upd.ok).toBe(false);
    const pause = await setListingStatus({ userId: sellerB, businessId: bizB }, listingId, "pause" as never);
    expect(pause.ok).toBe(false);
    const remove = await setListingStatus({ userId: sellerB, businessId: bizB }, listingId, "remove" as never);
    expect(remove.ok).toBe(false);
    // Seller B pretending to act for business A is also refused (membership check).
    const spoof = await updateListing({ userId: sellerB, businessId: bizA }, listingId, { commodityId: rice, title: "Hijacked", quantity: "1", unitId: kg, priceType: "quote" } as never);
    expect(spoof.ok).toBe(false);
    const [row] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, listingId));
    expect(row.title).toBe("Ownership test rice");
  });
  it("seller A can still manage it", async () => {
    const pause = await setListingStatus({ userId: sellerA, businessId: bizA }, listingId, "pause" as never);
    expect(pause.ok || (!pause.ok && pause.error === "invalid_transition")).toBe(true);
  });
});

describe("RFQ ownership", () => {
  let rfqId = "";
  it("buyer C posts a request that matches rice suppliers", async () => {
    const r = await createRfq(buyerC, { commodityId: rice, quantity: "1000", unitId: kg, cityId: lahore, contactPreference: "any" });
    rfqId = r.id;
    expect(r.reference).toMatch(/^RFQ-\d{4}-/);
    expect(r.matchedCount).toBeGreaterThanOrEqual(2);
  });
  it("buyer D cannot read, close or cancel buyer C's request", async () => {
    expect(await getRfqForBuyer(rfqId, buyerD, "en")).toBeNull();
    await expect(closeRfq(rfqId, buyerD)).rejects.toThrow();
    await expect(cancelRfq(rfqId, buyerD)).rejects.toThrow();
    const [row] = await db.select({ status: rfqs.status }).from(rfqs).where(eq(rfqs.id, rfqId));
    expect(["submitted", "matching"]).toContain(row.status);
  });
  it("a matched supplier can quote, an unrelated business cannot quote a direct enquiry", async () => {
    const q = await sendQuote({ userId: sellerA, businessId: bizA }, rfqId, { priceAmount: "250", priceUnitId: kg, quantity: "1000", quantityUnitId: kg, notes: "Ex-mill Lahore" } as never);
    expect(q.ok).toBe(true);
    const direct = await createRfq(buyerD, { commodityId: rice, quantity: "10", unitId: kg, contactPreference: "platform", targetBusinessId: bizB });
    const intruder = await sendQuote({ userId: sellerA, businessId: bizA }, direct.id, { priceAmount: "1", priceUnitId: kg, quantity: "10", quantityUnitId: kg } as never);
    expect(intruder.ok).toBe(false);
  });
  it("buyer C sees the offer and can close the request", async () => {
    const view = await getRfqForBuyer(rfqId, buyerC, "en");
    expect(view).not.toBeNull();
    expect((view as { quotes: unknown[] }).quotes.length).toBe(1);
    await closeRfq(rfqId, buyerC, "found supplier");
    const [row] = await db.select({ status: rfqs.status }).from(rfqs).where(eq(rfqs.id, rfqId));
    expect(row.status).toBe("closed");
  });
});
