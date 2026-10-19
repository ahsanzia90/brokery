import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businessCommodities, commodities, enquiryEvents, locations, profiles, rfqRecipients, rfqs, supplierQuotes, units } from "@/db/schema";
import { getUnits } from "@/lib/data/taxonomy";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics/track";
import { optionalDecimal, optionalText, fieldErrorsFromZod, type ActionResult } from "@/lib/validation/common";
import { userCanManageBusiness } from "./queries";

export type QuoteActor = { userId: string; businessId: string };

export const quoteSchema = z
  .object({
    priceAmount: optionalDecimal.optional(),
    priceUnitId: z.union([z.string().uuid(), z.literal(""), z.null(), z.undefined()]).optional().transform((v) => (v ? v : null)),
    quantity: optionalDecimal.optional(),
    quantityUnitId: z.union([z.string().uuid(), z.literal(""), z.null(), z.undefined()]).optional().transform((v) => (v ? v : null)),
    validUntil: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v ? v : null)),
    deliveryTerms: optionalText(500).optional(),
    notes: optionalText(2000).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.priceAmount && !d.priceUnitId) ctx.addIssue({ code: "custom", path: ["priceUnitId"], message: "required" });
    if (d.priceUnitId && !d.priceAmount) ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "required" });
    if (d.quantity && !d.quantityUnitId) ctx.addIssue({ code: "custom", path: ["quantityUnitId"], message: "required" });
    if (!d.priceAmount && !d.notes) ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "price_or_notes" });
  });
export type QuoteInput = z.input<typeof quoteSchema>;

const OPEN_RFQ = ["submitted", "matching", "responses_received", "in_discussion"] as const;

/** Can this business respond to the RFQ? Returns the reason or null. */
async function eligibility(actor: QuoteActor, rfqId: string): Promise<{ rfq: typeof rfqs.$inferSelect; recipient: typeof rfqRecipients.$inferSelect | null } | { error: string }> {
  if (!(await userCanManageBusiness(actor.userId, actor.businessId))) return { error: "forbidden" };
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
  if (!rfq) return { error: "not_found" };
  const [recipient] = await db.select().from(rfqRecipients).where(and(eq(rfqRecipients.rfqId, rfqId), eq(rfqRecipients.businessId, actor.businessId))).limit(1);
  if (recipient) return { rfq, recipient };
  if (rfq.targetBusinessId === actor.businessId) return { rfq, recipient: null };
  if (rfq.targetBusinessId) return { error: "forbidden" }; // direct enquiry to someone else
  if (!(OPEN_RFQ as readonly string[]).includes(rfq.status)) return { error: "closed" };
  const [supplies] = await db
    .select({ id: businessCommodities.id })
    .from(businessCommodities)
    .where(and(eq(businessCommodities.businessId, actor.businessId), eq(businessCommodities.commodityId, rfq.commodityId)))
    .limit(1);
  if (!supplies) {
    const [hasListing] = await db.execute(sql`SELECT 1 FROM listings WHERE business_id = ${actor.businessId} AND commodity_id = ${rfq.commodityId} AND status = 'published' LIMIT 1`).then((r) => r.rows);
    if (!hasListing) return { error: "forbidden" };
  }
  return { rfq, recipient: null };
}

export async function sendQuote(actor: QuoteActor, rfqId: string, raw: QuoteInput): Promise<ActionResult<{ quoteId: string }>> {
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrorsFromZod(parsed.error) };
  const d = parsed.data;
  const el = await eligibility(actor, rfqId);
  if ("error" in el) return { ok: false, error: el.error };
  if (!(OPEN_RFQ as readonly string[]).includes(el.rfq.status)) return { ok: false, error: "closed" };
  const unitIds = new Set((await getUnits()).map((u) => u.id));
  if (d.priceUnitId && !unitIds.has(d.priceUnitId)) return { ok: false, error: "validation", fieldErrors: { priceUnitId: "invalid" } };
  if (d.quantityUnitId && !unitIds.has(d.quantityUnitId)) return { ok: false, error: "validation", fieldErrors: { quantityUnitId: "invalid" } };

  const quoteId = await db.transaction(async (tx) => {
    if (!el.recipient) {
      await tx.insert(rfqRecipients).values({ rfqId, businessId: actor.businessId, state: "responded", matchReason: el.rfq.targetBusinessId === actor.businessId ? "direct" : "commodity", viewedAt: new Date() }).onConflictDoNothing();
    }
    const values = {
      rfqId,
      businessId: actor.businessId,
      respondedBy: actor.userId,
      priceAmount: d.priceAmount ? String(d.priceAmount) : null,
      priceUnitId: d.priceAmount ? d.priceUnitId : null,
      quantity: d.quantity ? String(d.quantity) : null,
      quantityUnitId: d.quantity ? d.quantityUnitId : null,
      validUntil: d.validUntil,
      deliveryTerms: d.deliveryTerms ?? null,
      notes: d.notes ?? null,
      status: "sent" as const,
    };
    const [q] = await tx
      .insert(supplierQuotes)
      .values(values)
      .onConflictDoUpdate({ target: [supplierQuotes.rfqId, supplierQuotes.businessId], set: { ...values, viewedAt: null, updatedAt: new Date() } })
      .returning({ id: supplierQuotes.id });
    await tx.update(rfqRecipients).set({ state: "responded" }).where(and(eq(rfqRecipients.rfqId, rfqId), eq(rfqRecipients.businessId, actor.businessId)));
    if (el.rfq.status === "submitted" || el.rfq.status === "matching") await tx.update(rfqs).set({ status: "responses_received" }).where(eq(rfqs.id, rfqId));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId: q.id, actorId: actor.userId, eventType: "quote_sent", metadata: { businessId: actor.businessId, priceAmount: values.priceAmount } });
    await notify({ userId: el.rfq.buyerId, type: "quote_received", title: "New offer on your request", body: el.rfq.reference, linkPath: `/rfq/${rfqId}`, entityType: "rfq", entityId: rfqId }, tx);
    return q.id;
  });
  await track("quote_sent", { entityType: "rfq", entityId: rfqId, properties: { businessId: actor.businessId } });
  return { ok: true, data: { quoteId } };
}

export async function declineRfq(actor: QuoteActor, rfqId: string): Promise<ActionResult> {
  const el = await eligibility(actor, rfqId);
  if ("error" in el) return { ok: false, error: el.error };
  await db.transaction(async (tx) => {
    await tx
      .insert(rfqRecipients)
      .values({ rfqId, businessId: actor.businessId, state: "declined", matchReason: el.rfq.targetBusinessId === actor.businessId ? "direct" : "commodity" })
      .onConflictDoUpdate({ target: [rfqRecipients.rfqId, rfqRecipients.businessId], set: { state: "declined" } });
    await tx.update(supplierQuotes).set({ status: "withdrawn" }).where(and(eq(supplierQuotes.rfqId, rfqId), eq(supplierQuotes.businessId, actor.businessId), inArray(supplierQuotes.status, ["sent", "viewed"])));
    await tx.insert(enquiryEvents).values({ rfqId, actorId: actor.userId, eventType: "supplier_declined", metadata: { businessId: actor.businessId } });
  });
  return { ok: true };
}

export async function withdrawQuote(actor: QuoteActor, rfqId: string): Promise<ActionResult> {
  if (!(await userCanManageBusiness(actor.userId, actor.businessId))) return { ok: false, error: "forbidden" };
  const [q] = await db.select().from(supplierQuotes).where(and(eq(supplierQuotes.rfqId, rfqId), eq(supplierQuotes.businessId, actor.businessId))).limit(1);
  if (!q) return { ok: false, error: "not_found" };
  if (!["sent", "viewed", "contacted"].includes(q.status)) return { ok: false, error: "invalid_transition" };
  await db.transaction(async (tx) => {
    await tx.update(supplierQuotes).set({ status: "withdrawn" }).where(eq(supplierQuotes.id, q.id));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId: q.id, actorId: actor.userId, eventType: "quote_withdrawn", metadata: { businessId: actor.businessId } });
  });
  return { ok: true };
}

export async function markRecipientViewed(actor: QuoteActor, rfqId: string): Promise<void> {
  if (!(await userCanManageBusiness(actor.userId, actor.businessId))) return;
  await db
    .update(rfqRecipients)
    .set({ state: "viewed", viewedAt: new Date() })
    .where(and(eq(rfqRecipients.rfqId, rfqId), eq(rfqRecipients.businessId, actor.businessId), inArray(rfqRecipients.state, ["matched", "notified"])));
}

/* ---------- Seller-side queries ---------- */

export type IncomingRfq = {
  rfqId: string;
  reference: string;
  status: string;
  recipientState: string | null;
  matchReason: string | null;
  isDirect: boolean;
  commodityName: string;
  commodityNameUr: string | null;
  quantity: string;
  unitSymbol: string;
  cityName: string | null;
  cityNameUr: string | null;
  requiredBy: string | null;
  buyerFirstName: string;
  createdAt: Date;
  quoteStatus: string | null;
  quotePrice: string | null;
  quoteUnitSymbol: string | null;
};

export async function getIncomingRfqs(businessId: string, tab: "new" | "responded" | "declined" = "new"): Promise<IncomingRfq[]> {
  const stateFilter = tab === "new" ? inArray(rfqRecipients.state, ["matched", "notified", "viewed"]) : tab === "responded" ? eq(rfqRecipients.state, "responded") : eq(rfqRecipients.state, "declined");
  const qu = db
    .select({
      r: rfqs,
      recipientState: rfqRecipients.state,
      matchReason: rfqRecipients.matchReason,
      commodityName: commodities.nameEn,
      commodityNameUr: commodities.nameUr,
      unitSymbol: units.symbol,
      cityName: locations.nameEn,
      cityNameUr: locations.nameUr,
      buyerName: profiles.name,
      quoteStatus: supplierQuotes.status,
      quotePrice: supplierQuotes.priceAmount,
      quoteUnitSymbol: sql<string | null>`(SELECT symbol FROM units u2 WHERE u2.id = ${supplierQuotes.priceUnitId})`,
    })
    .from(rfqRecipients)
    .innerJoin(rfqs, eq(rfqs.id, rfqRecipients.rfqId))
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .innerJoin(units, eq(units.id, rfqs.unitId))
    .leftJoin(locations, eq(locations.id, rfqs.cityId))
    .innerJoin(profiles, eq(profiles.id, rfqs.buyerId))
    .leftJoin(supplierQuotes, and(eq(supplierQuotes.rfqId, rfqs.id), eq(supplierQuotes.businessId, businessId)))
    .where(and(eq(rfqRecipients.businessId, businessId), stateFilter, tab === "new" ? inArray(rfqs.status, [...OPEN_RFQ]) : undefined))
    .orderBy(desc(rfqs.createdAt))
    .limit(100);
  const rows = await qu;
  return rows.map((x) => ({
    rfqId: x.r.id,
    reference: x.r.reference,
    status: x.r.status,
    recipientState: x.recipientState,
    matchReason: x.matchReason,
    isDirect: x.r.targetBusinessId === businessId,
    commodityName: x.commodityName,
    commodityNameUr: x.commodityNameUr,
    quantity: x.r.quantity,
    unitSymbol: x.unitSymbol,
    cityName: x.cityName,
    cityNameUr: x.cityNameUr,
    requiredBy: x.r.requiredBy,
    buyerFirstName: (x.buyerName || "Buyer").split(" ")[0],
    createdAt: x.r.createdAt,
    quoteStatus: x.quoteStatus,
    quotePrice: x.quotePrice,
    quoteUnitSymbol: x.quoteUnitSymbol,
  }));
}

/** Detail for the seller: buyer phone only after responding and when the buyer allows it. */
export async function getIncomingRfqDetail(actor: QuoteActor, rfqId: string) {
  const el = await eligibility(actor, rfqId);
  if ("error" in el) return null;
  const [row] = await db
    .select({
      r: rfqs,
      commodity: commodities,
      unitSymbol: units.symbol,
      city: locations,
      buyerName: profiles.name,
      buyerPhone: profiles.phone,
      varietyName: sql<string | null>`(SELECT name_en FROM commodity_varieties v WHERE v.id = ${rfqs.varietyId})`,
      gradeName: sql<string | null>`(SELECT name_en FROM commodity_grades g WHERE g.id = ${rfqs.gradeId})`,
      targetUnitSymbol: sql<string | null>`(SELECT symbol FROM units u2 WHERE u2.id = ${rfqs.targetPriceUnitId})`,
    })
    .from(rfqs)
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .innerJoin(units, eq(units.id, rfqs.unitId))
    .leftJoin(locations, eq(locations.id, rfqs.cityId))
    .innerJoin(profiles, eq(profiles.id, rfqs.buyerId))
    .where(eq(rfqs.id, rfqId))
    .limit(1);
  if (!row) return null;
  const [quote] = await db.select().from(supplierQuotes).where(and(eq(supplierQuotes.rfqId, rfqId), eq(supplierQuotes.businessId, actor.businessId))).limit(1);
  const responded = Boolean(quote && quote.status !== "withdrawn");
  const buyerAllowsContact = row.r.contactPreference !== "platform";
  return {
    rfq: row.r,
    commodity: row.commodity,
    varietyName: row.varietyName,
    gradeName: row.gradeName,
    unitSymbol: row.unitSymbol,
    targetUnitSymbol: row.targetUnitSymbol,
    city: row.city,
    buyerFirstName: (row.buyerName || "Buyer").split(" ")[0],
    buyerPhone: responded && buyerAllowsContact ? row.buyerPhone : null,
    buyerAllowsContact,
    contactPreference: row.r.contactPreference,
    recipient: el.recipient,
    quote: quote ?? null,
    isOpen: (OPEN_RFQ as readonly string[]).includes(row.r.status),
    isDirect: row.r.targetBusinessId === actor.businessId,
  };
}
