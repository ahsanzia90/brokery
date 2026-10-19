import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  businessCommodities,
  businessMembers,
  businesses,
  commodities,
  enquiryEvents,
  listings,
  rfqAttributes,
  rfqRecipients,
  rfqs,
  supplierQuotes,
} from "@/db/schema";
import { getSetting } from "@/lib/config/settings";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics/track";
import { makeReference } from "@/lib/utils/ids";
import { optionalDecimal, optionalText, optionalUuid, positiveDecimal, uuidSchema } from "@/lib/validation/common";

/** getSetting relies on Next's cache runtime; fall back to defaults when called from scripts/tests. */
async function settingOr<T>(key: string, fallback: T): Promise<T> {
  try {
    return await getSetting<T>(key, fallback);
  } catch {
    return fallback;
  }
}

export class RfqError extends Error {
  constructor(public code: string, public fieldErrors?: Record<string, string>) {
    super(code);
  }
}

export const createRfqSchema = z.object({
  commodityId: z.string().uuid().optional(),
  commoditySlug: z.string().max(120).optional(),
  varietyId: optionalUuid.optional(),
  gradeId: optionalUuid.optional(),
  customSpecification: optionalText(300).optional(),
  quantity: positiveDecimal,
  unitId: uuidSchema,
  provinceId: optionalUuid.optional(),
  cityId: optionalUuid.optional(),
  marketId: optionalUuid.optional(),
  requiredBy: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null))
    .optional(),
  targetPrice: optionalDecimal.optional(),
  targetPriceUnitId: optionalUuid.optional(),
  qualityRequirements: optionalText(1000).optional(),
  notes: optionalText(2000).optional(),
  contactPreference: z.enum(["platform", "phone", "whatsapp", "any"]).default("any"),
  listingId: optionalUuid.optional(),
  listingSlug: z.string().max(200).optional().nullable(),
  targetBusinessId: optionalUuid.optional(),
  supplierSlug: z.string().max(200).optional().nullable(),
  attributes: z.record(z.string(), z.string()).optional(),
});
export type CreateRfqInput = z.input<typeof createRfqSchema>;

async function nextReference(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const ref = makeReference("RFQ");
    const [existing] = await db.select({ id: rfqs.id }).from(rfqs).where(eq(rfqs.reference, ref)).limit(1);
    if (!existing) return ref;
  }
  throw new RfqError("reference_collision");
}

/** Business ids the buyer owns/belongs to — excluded from matching. */
async function buyerBusinessIds(buyerId: string): Promise<string[]> {
  const owned = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, buyerId));
  const member = await db.select({ id: businessMembers.businessId }).from(businessMembers).where(eq(businessMembers.userId, buyerId));
  return [...new Set([...owned.map((o) => o.id), ...member.map((m) => m.id)])];
}

export async function createRfq(buyerId: string, raw: CreateRfqInput): Promise<{ id: string; reference: string; matchedCount: number }> {
  const parsed = createRfqSchema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "_");
      if (!fe[k]) fe[k] = issue.message;
    }
    throw new RfqError("validation", fe);
  }
  const input = parsed.data;

  // Resolve commodity
  let commodityId = input.commodityId ?? null;
  if (!commodityId && input.commoditySlug) {
    const [c] = await db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, input.commoditySlug)).limit(1);
    commodityId = c?.id ?? null;
  }
  if (!commodityId) throw new RfqError("validation", { commodityId: "required" });
  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, commodityId)).limit(1);
  if (!commodity || commodity.status !== "active") throw new RfqError("validation", { commodityId: "invalid" });

  // Resolve listing / supplier targets
  let listingId = input.listingId;
  let targetBusinessId = input.targetBusinessId;
  if (!listingId && input.listingSlug) {
    const [l] = await db.select({ id: listings.id, businessId: listings.businessId }).from(listings).where(eq(listings.slug, input.listingSlug)).limit(1);
    if (l) {
      listingId = l.id;
      targetBusinessId = targetBusinessId ?? l.businessId;
    }
  } else if (listingId) {
    const [l] = await db.select({ businessId: listings.businessId }).from(listings).where(eq(listings.id, listingId)).limit(1);
    if (l) targetBusinessId = targetBusinessId ?? l.businessId;
  }
  if (!targetBusinessId && input.supplierSlug) {
    const [b] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, input.supplierSlug)).limit(1);
    targetBusinessId = b?.id ?? null;
  }
  if (input.targetPrice != null && !input.targetPriceUnitId) throw new RfqError("validation", { targetPriceUnitId: "required" });

  const perDay = await settingOr<number>("rate_limits.rfq_create_per_day", 20);
  try {
    await enforceRateLimit(`rfq_create:${buyerId}`, perDay, 86_400);
  } catch (e) {
    if (e instanceof RateLimitError) throw new RfqError("rate_limited");
    throw e;
  }

  const expiryDays = await settingOr<number>("rfq.expiry_days", 14);
  const reference = await nextReference();
  const excluded = await buyerBusinessIds(buyerId);

  const result = await db.transaction(async (tx) => {
    const [rfq] = await tx
      .insert(rfqs)
      .values({
        reference,
        buyerId,
        commodityId: commodity.id,
        varietyId: input.varietyId ?? null,
        gradeId: input.gradeId ?? null,
        customSpecification: input.customSpecification ?? null,
        listingId: listingId ?? null,
        targetBusinessId: targetBusinessId ?? null,
        quantity: String(input.quantity),
        unitId: input.unitId,
        provinceId: input.provinceId ?? null,
        cityId: input.cityId ?? null,
        marketId: input.marketId ?? null,
        requiredBy: input.requiredBy ?? null,
        targetPrice: input.targetPrice == null ? null : String(input.targetPrice),
        targetPriceUnitId: input.targetPrice == null ? null : (input.targetPriceUnitId ?? null),
        qualityRequirements: input.qualityRequirements ?? null,
        notes: input.notes ?? null,
        contactPreference: input.contactPreference,
        status: "submitted",
        expiresAt: new Date(Date.now() + expiryDays * 86_400_000),
      })
      .returning();

    if (input.attributes) {
      const rows = Object.entries(input.attributes)
        .filter(([k, v]) => /^[0-9a-f-]{36}$/i.test(k) && v.trim())
        .map(([attributeId, value]) => {
          const n = Number(value);
          return { rfqId: rfq.id, attributeId, valueText: value.trim().slice(0, 300), valueNumber: Number.isFinite(n) && value.trim() !== "" ? String(n) : null };
        });
      if (rows.length) await tx.insert(rfqAttributes).values(rows).onConflictDoNothing();
    }

    // ---- Matching ----
    const matches = new Map<string, string>(); // businessId -> matchReason
    const consider = (id: string, reason: string) => {
      if (excluded.includes(id)) return;
      if (!matches.has(id)) matches.set(id, reason);
    };
    if (targetBusinessId) {
      const [b] = await tx.select({ id: businesses.id, status: businesses.status }).from(businesses).where(eq(businesses.id, targetBusinessId)).limit(1);
      if (b && b.status === "active") consider(b.id, "direct");
    }
    // A direct enquiry (started from a listing or supplier profile) goes only to that supplier.
    // Open requests are matched to every active supplier of the commodity, same city first.
    if (!targetBusinessId) {
      const declared = await tx
        .select({ id: businesses.id, cityId: businesses.cityId })
        .from(businessCommodities)
        .innerJoin(businesses, eq(businesses.id, businessCommodities.businessId))
        .where(and(eq(businessCommodities.commodityId, commodity.id), eq(businesses.status, "active")));
      const listed = await tx
        .selectDistinct({ id: businesses.id, cityId: listings.cityId })
        .from(listings)
        .innerJoin(businesses, eq(businesses.id, listings.businessId))
        .where(and(eq(listings.commodityId, commodity.id), eq(listings.status, "published"), eq(businesses.status, "active")));
      const sameCity = [...declared, ...listed].filter((b) => input.cityId && b.cityId === input.cityId);
      const others = [...declared.map((d) => ({ ...d, reason: "commodity" })), ...listed.map((l) => ({ ...l, reason: "listing" }))];
      for (const b of sameCity) consider(b.id, "commodity+city");
      for (const b of others) consider(b.id, b.reason);
    }

    const recipientRows = [...matches.entries()].slice(0, 50).map(([businessId, matchReason]) => ({ rfqId: rfq.id, businessId, matchReason, state: "matched" as const }));
    if (recipientRows.length) await tx.insert(rfqRecipients).values(recipientRows).onConflictDoNothing();
    const matchedCount = recipientRows.length;
    if (matchedCount > 0) await tx.update(rfqs).set({ status: "matching" }).where(eq(rfqs.id, rfq.id));

    await tx.insert(enquiryEvents).values([
      { rfqId: rfq.id, actorId: buyerId, eventType: "submitted", metadata: { reference } },
      { rfqId: rfq.id, actorId: null, eventType: "matched", metadata: { count: matchedCount } },
    ]);

    // Notify recipient business owners (in-app always; external channels when configured).
    if (recipientRows.length) {
      const owners = await tx
        .select({ businessId: businesses.id, ownerId: businesses.ownerId })
        .from(businesses)
        .where(inArray(businesses.id, recipientRows.map((r) => r.businessId)));
      for (const o of owners) {
        await notify(
          {
            userId: o.ownerId,
            type: "new_rfq",
            title: `New buyer request: ${commodity.nameEn}${commodity.nameUr ? ` / ${commodity.nameUr}` : ""}`,
            body: `${reference} · ${input.quantity} units requested. Open to send your offer.`,
            linkPath: `/dashboard/seller/enquiries/${rfq.id}`,
            entityType: "rfq",
            entityId: rfq.id,
          },
          tx,
        );
      }
      await tx.update(rfqRecipients).set({ state: "notified", notifiedAt: new Date() }).where(and(eq(rfqRecipients.rfqId, rfq.id), eq(rfqRecipients.state, "matched")));
    }
    return { id: rfq.id, reference, matchedCount };
  });

  await track("rfq_created", { entityType: "rfq", entityId: result.id, properties: { commodityId: commodity.id, matched: result.matchedCount } });
  return result;
}

/* ------------------------- buyer-side mutations ------------------------- */

async function ownedRfq(rfqId: string, buyerId: string) {
  const [rfq] = await db.select().from(rfqs).where(and(eq(rfqs.id, rfqId), eq(rfqs.buyerId, buyerId))).limit(1);
  if (!rfq) throw new RfqError("not_found");
  return rfq;
}

async function ownedQuote(rfqId: string, quoteId: string, buyerId: string) {
  const rfq = await ownedRfq(rfqId, buyerId);
  const [quote] = await db.select().from(supplierQuotes).where(and(eq(supplierQuotes.id, quoteId), eq(supplierQuotes.rfqId, rfqId))).limit(1);
  if (!quote) throw new RfqError("not_found");
  return { rfq, quote };
}

async function sellerUserForQuote(quote: typeof supplierQuotes.$inferSelect): Promise<string | null> {
  const [b] = await db.select({ ownerId: businesses.ownerId }).from(businesses).where(eq(businesses.id, quote.businessId)).limit(1);
  return b?.ownerId ?? quote.respondedBy ?? null;
}

export async function markQuoteViewed(rfqId: string, quoteId: string, buyerId: string): Promise<void> {
  const { quote } = await ownedQuote(rfqId, quoteId, buyerId);
  if (quote.status !== "sent") return;
  await db.transaction(async (tx) => {
    await tx.update(supplierQuotes).set({ status: "viewed", viewedAt: new Date() }).where(eq(supplierQuotes.id, quoteId));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId, actorId: buyerId, eventType: "quote_viewed" });
  });
}

/** Mark all newly received quotes on an RFQ as viewed (called when the buyer opens the request page). */
export async function markAllQuotesViewed(rfqId: string, buyerId: string): Promise<void> {
  await ownedRfq(rfqId, buyerId);
  const fresh = await db.select({ id: supplierQuotes.id }).from(supplierQuotes).where(and(eq(supplierQuotes.rfqId, rfqId), eq(supplierQuotes.status, "sent")));
  if (!fresh.length) return;
  await db.transaction(async (tx) => {
    await tx.update(supplierQuotes).set({ status: "viewed", viewedAt: new Date() }).where(and(eq(supplierQuotes.rfqId, rfqId), eq(supplierQuotes.status, "sent")));
    await tx.insert(enquiryEvents).values(fresh.map((q) => ({ rfqId, quoteId: q.id, actorId: buyerId, eventType: "quote_viewed" })));
  });
}

export async function acceptQuoteForDiscussion(rfqId: string, quoteId: string, buyerId: string): Promise<void> {
  const { rfq, quote } = await ownedQuote(rfqId, quoteId, buyerId);
  if (rfq.status === "closed" || rfq.status === "cancelled") throw new RfqError("closed");
  if (!["sent", "viewed", "contacted"].includes(quote.status)) throw new RfqError("invalid_state");
  await db.transaction(async (tx) => {
    await tx.update(supplierQuotes).set({ status: "accepted" }).where(eq(supplierQuotes.id, quoteId));
    await tx.update(rfqs).set({ status: "in_discussion" }).where(eq(rfqs.id, rfqId));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId, actorId: buyerId, eventType: "quote_accepted" });
  });
  const sellerId = await sellerUserForQuote(quote);
  if (sellerId) {
    await notify({ userId: sellerId, type: "buyer_contacted", title: `Buyer accepted your offer for discussion (${rfq.reference})`, linkPath: `/dashboard/seller/enquiries/${rfqId}`, entityType: "rfq", entityId: rfqId });
  }
}

export async function declineQuote(rfqId: string, quoteId: string, buyerId: string): Promise<void> {
  const { quote } = await ownedQuote(rfqId, quoteId, buyerId);
  if (!["sent", "viewed", "contacted", "accepted"].includes(quote.status)) throw new RfqError("invalid_state");
  await db.transaction(async (tx) => {
    await tx.update(supplierQuotes).set({ status: "declined" }).where(eq(supplierQuotes.id, quoteId));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId, actorId: buyerId, eventType: "quote_declined" });
  });
}

export async function closeRfq(rfqId: string, buyerId: string, reason?: string | null): Promise<void> {
  const rfq = await ownedRfq(rfqId, buyerId);
  if (rfq.status === "closed" || rfq.status === "cancelled") return;
  await db.transaction(async (tx) => {
    await tx.update(rfqs).set({ status: "closed", closedReason: reason?.slice(0, 500) ?? null }).where(eq(rfqs.id, rfqId));
    await tx.update(supplierQuotes).set({ status: "expired" }).where(and(eq(supplierQuotes.rfqId, rfqId), inArray(supplierQuotes.status, ["sent", "viewed"])));
    await tx.insert(enquiryEvents).values({ rfqId, actorId: buyerId, eventType: "closed", metadata: reason ? { reason } : undefined });
  });
}

export async function cancelRfq(rfqId: string, buyerId: string): Promise<void> {
  const rfq = await ownedRfq(rfqId, buyerId);
  if (rfq.status === "closed" || rfq.status === "cancelled") return;
  await db.transaction(async (tx) => {
    await tx.update(rfqs).set({ status: "cancelled" }).where(eq(rfqs.id, rfqId));
    await tx.update(supplierQuotes).set({ status: "expired" }).where(and(eq(supplierQuotes.rfqId, rfqId), inArray(supplierQuotes.status, ["sent", "viewed"])));
    await tx.insert(enquiryEvents).values({ rfqId, actorId: buyerId, eventType: "cancelled" });
  });
}

export async function recordBuyerContacted(rfqId: string, quoteId: string, buyerId: string, channel: "phone" | "whatsapp"): Promise<void> {
  const { rfq, quote } = await ownedQuote(rfqId, quoteId, buyerId);
  await db.transaction(async (tx) => {
    if (["sent", "viewed"].includes(quote.status)) await tx.update(supplierQuotes).set({ status: "contacted" }).where(eq(supplierQuotes.id, quoteId));
    if (["submitted", "matching", "responses_received"].includes(rfq.status)) await tx.update(rfqs).set({ status: "in_discussion" }).where(eq(rfqs.id, rfqId));
    await tx.insert(enquiryEvents).values({ rfqId, quoteId, actorId: buyerId, eventType: "contact_clicked", metadata: { channel } });
  });
  const sellerId = await sellerUserForQuote(quote);
  if (sellerId) {
    await notify({ userId: sellerId, type: "buyer_contacted", title: `Buyer is contacting you about ${rfq.reference}`, linkPath: `/dashboard/seller/enquiries/${rfqId}`, entityType: "rfq", entityId: rfqId });
  }
}

/** Expire open RFQs past their expiresAt. Intended for a cron route. */
export async function expireRfqs(): Promise<number> {
  const rows = await db
    .update(rfqs)
    .set({ status: "closed", closedReason: "expired" })
    .where(and(inArray(rfqs.status, ["submitted", "matching", "responses_received"]), sql`${rfqs.expiresAt} IS NOT NULL AND ${rfqs.expiresAt} < now()`))
    .returning({ id: rfqs.id });
  if (rows.length) {
    await db.insert(enquiryEvents).values(rows.map((r) => ({ rfqId: r.id, eventType: "closed", metadata: { reason: "expired" } })));
  }
  return rows.length;
}

export const OPEN_RFQ_STATUSES = ["submitted", "matching", "responses_received", "in_discussion"] as const;
