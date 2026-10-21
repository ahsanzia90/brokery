/**
 * A seller who registers (or adds a commodity) after a buyer request was posted must still
 * see it: open requests are attached when the business saves its commodity list, every open
 * request is browsable, and a seller can add a commodity and respond from the request itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

const { db, pool } = await import("@/db");
const { profiles, businesses, businessCommodities, rfqs, rfqRecipients, commodities, units, locations, userRoles } = await import("@/db/schema");
const { createRfq } = await import("@/lib/rfq/service");
const { attachOpenRfqsToBusiness, getIncomingRfqs, getOpenRfqsForBrowsing, getIncomingRfqDetail, getRfqPreviewForSeller, joinRfq, sendQuote } = await import("@/lib/business/quote-service");

const users: string[] = [];
let buyer = "", lateSeller = "", otherSeller = "";
let lateBiz = "", otherBiz = "";
let rice = "", wheat = "", kg = "", lahore = "";
let riceRfq = "", wheatRfq = "";

async function mkUser(phone: string, name: string) {
  const [u] = await db.insert(profiles).values({ phone, name, isSeller: true }).returning();
  await db.insert(userRoles).values([{ userId: u.id, role: "buyer" }, { userId: u.id, role: "seller" }]);
  users.push(u.id);
  return u.id;
}

beforeAll(async () => {
  const ts = Date.now().toString().slice(-6);
  [rice, wheat, kg, lahore] = await Promise.all([
    db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, "rice")).then((r) => r[0].id),
    db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, "wheat")).then((r) => r[0].id),
    db.select({ id: units.id }).from(units).where(eq(units.code, "kg")).then((r) => r[0].id),
    db.select({ id: locations.id }).from(locations).where(eq(locations.path, "punjab/lahore")).then((r) => r[0].id),
  ]);
  buyer = await mkUser(`+92312${ts}1`, "Late Buyer");
  lateSeller = await mkUser(`+92312${ts}2`, "Late Seller");
  otherSeller = await mkUser(`+92312${ts}3`, "Other Seller");
  // Buyer posts two open requests BEFORE the late seller exists.
  riceRfq = (await createRfq(buyer, { commodityId: rice, quantity: "1000", unitId: kg, cityId: lahore })).id;
  wheatRfq = (await createRfq(buyer, { commodityId: wheat, quantity: "500", unitId: kg, cityId: lahore })).id;
});

afterAll(async () => {
  await db.delete(rfqs).where(inArray(rfqs.buyerId, [buyer]));
  await db.delete(businesses).where(inArray(businesses.id, [lateBiz, otherBiz].filter(Boolean)));
  await db.delete(profiles).where(inArray(profiles.id, users));
  await pool.end();
});

describe("late seller sees existing buyer requests", () => {
  it("attaches open requests when the seller lists a commodity", async () => {
    const [b] = await db.insert(businesses).values({ ownerId: lateSeller, name: "Late Traders", slug: `late-traders-${Date.now()}`, verificationLevel: "phone_verified" }).returning();
    lateBiz = b.id;
    await db.insert(businessCommodities).values({ businessId: lateBiz, commodityId: rice });
    const attached = await attachOpenRfqsToBusiness(lateBiz, [rice]);
    expect(attached).toBe(1);
    // Idempotent.
    expect(await attachOpenRfqsToBusiness(lateBiz, [rice])).toBe(0);
    const inbox = await getIncomingRfqs(lateBiz, "new");
    expect(inbox.map((r) => r.rfqId)).toContain(riceRfq);
    expect(inbox.map((r) => r.rfqId)).not.toContain(wheatRfq);
  });

  it("lists every open request with a supplies flag", async () => {
    const open = await getOpenRfqsForBrowsing(lateBiz);
    const byId = new Map(open.map((r) => [r.rfqId, r]));
    expect(byId.get(riceRfq)?.supplies).toBe(true);
    expect(byId.get(wheatRfq)?.supplies).toBe(false);
  });

  it("offers a preview, then join + respond for a commodity not in the profile", async () => {
    const actor = { userId: lateSeller, businessId: lateBiz };
    expect(await getIncomingRfqDetail(actor, wheatRfq)).toBeNull();
    const preview = await getRfqPreviewForSeller(actor, wheatRfq);
    expect(preview?.commodity.id).toBe(wheat);
    const joined = await joinRfq(actor, wheatRfq);
    expect(joined.ok).toBe(true);
    const [bc] = await db.select().from(businessCommodities).where(eq(businessCommodities.businessId, lateBiz)).then((rows) => rows.filter((r) => r.commodityId === wheat));
    expect(bc).toBeTruthy();
    const detail = await getIncomingRfqDetail(actor, wheatRfq);
    expect(detail?.rfq.id).toBe(wheatRfq);
    const quote = await sendQuote(actor, wheatRfq, { priceAmount: "95", priceUnitId: kg });
    expect(quote.ok).toBe(true);
    const [rec] = await db.select().from(rfqRecipients).where(eq(rfqRecipients.rfqId, wheatRfq)).then((rows) => rows.filter((r) => r.businessId === lateBiz));
    expect(rec?.state).toBe("responded");
  });

  it("does not attach the buyer's own business or direct enquiries to others", async () => {
    const [b] = await db.insert(businesses).values({ ownerId: otherSeller, name: "Other Traders", slug: `other-traders-${Date.now()}`, verificationLevel: "phone_verified" }).returning();
    otherBiz = b.id;
    const direct = await createRfq(buyer, { commodityId: rice, quantity: "10", unitId: kg, targetBusinessId: otherBiz });
    expect(direct.matchedCount).toBe(1);
    // A late seller listing rice must not be attached to the direct enquiry meant for otherBiz.
    await attachOpenRfqsToBusiness(lateBiz, [rice]);
    const recips = await db.select().from(rfqRecipients).where(eq(rfqRecipients.rfqId, direct.id));
    expect(recips.map((r) => r.businessId)).toEqual([otherBiz]);
    const open = await getOpenRfqsForBrowsing(lateBiz);
    expect(open.map((r) => r.rfqId)).not.toContain(direct.id);
    // The buyer's own business never sees the buyer's requests.
    const [own] = await db.insert(businesses).values({ ownerId: buyer, name: "Buyer Own Biz", slug: `buyer-own-${Date.now()}`, verificationLevel: "phone_verified" }).returning();
    expect(await attachOpenRfqsToBusiness(own.id, [rice, wheat])).toBe(0);
    await db.delete(businesses).where(eq(businesses.id, own.id));
  });
});
