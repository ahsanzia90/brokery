import "server-only";
import { and, count, desc, eq, inArray, or, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { businessCommodities, businessDocuments, businessMembers, businessVerifications, businesses, commodities, listings, rfqRecipients, rfqs, supplierQuotes } from "@/db/schema";

export type BusinessRow = typeof businesses.$inferSelect;

/** The business a user owns, or is an active member of (owners first). */
export async function getBusinessForUser(userId: string): Promise<BusinessRow | null> {
  const [owned] = await db.select().from(businesses).where(and(eq(businesses.ownerId, userId), sql`${businesses.status} <> 'closed'`)).orderBy(desc(businesses.createdAt)).limit(1);
  if (owned) return owned;
  const [member] = await db
    .select({ b: businesses })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, "active"), sql`${businesses.status} <> 'closed'`))
    .limit(1);
  return member?.b ?? null;
}

/** True when the user owns or is an active member of the business. */
export async function userCanManageBusiness(userId: string, businessId: string): Promise<boolean> {
  const [b] = await db.select({ ownerId: businesses.ownerId }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!b) return false;
  if (b.ownerId === userId) return true;
  const [m] = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId), eq(businessMembers.status, "active")))
    .limit(1);
  return Boolean(m);
}

export type BusinessStats = {
  published: number;
  pending: number;
  paused: number;
  draft: number;
  rejected: number;
  expired: number;
  views: number;
  contactClicks: number;
  openRfqs: number;
  quotesSent: number;
};

export async function getBusinessStats(businessId: string): Promise<BusinessStats> {
  const byStatus = await db
    .select({ status: listings.status, n: count(), views: sum(listings.viewCount), clicks: sum(listings.contactClickCount) })
    .from(listings)
    .where(eq(listings.businessId, businessId))
    .groupBy(listings.status);
  const stat = (s: string) => byStatus.find((r) => r.status === s)?.n ?? 0;
  const views = byStatus.reduce((a, r) => a + Number(r.views ?? 0), 0);
  const clicks = byStatus.reduce((a, r) => a + Number(r.clicks ?? 0), 0);
  const [open] = await db
    .select({ n: count() })
    .from(rfqRecipients)
    .innerJoin(rfqs, eq(rfqs.id, rfqRecipients.rfqId))
    .where(and(eq(rfqRecipients.businessId, businessId), inArray(rfqRecipients.state, ["matched", "notified", "viewed"]), inArray(rfqs.status, ["submitted", "matching", "responses_received", "in_discussion"])));
  const [quotes] = await db.select({ n: count() }).from(supplierQuotes).where(and(eq(supplierQuotes.businessId, businessId), sql`${supplierQuotes.status} <> 'withdrawn'`));
  return {
    published: stat("published"),
    pending: stat("pending_review"),
    paused: stat("paused"),
    draft: stat("draft"),
    rejected: stat("rejected"),
    expired: stat("expired"),
    views,
    contactClicks: clicks,
    openRfqs: open?.n ?? 0,
    quotesSent: quotes?.n ?? 0,
  };
}

export async function getBusinessCommodities(businessId: string) {
  return db
    .select({ id: commodities.id, slug: commodities.slug, nameEn: commodities.nameEn, nameUr: commodities.nameUr })
    .from(businessCommodities)
    .innerJoin(commodities, eq(commodities.id, businessCommodities.commodityId))
    .where(eq(businessCommodities.businessId, businessId))
    .orderBy(commodities.nameEn);
}

export async function getVerificationHistory(businessId: string) {
  return db.select().from(businessVerifications).where(eq(businessVerifications.businessId, businessId)).orderBy(desc(businessVerifications.createdAt));
}

export async function getOpenVerification(businessId: string) {
  const [row] = await db
    .select()
    .from(businessVerifications)
    .where(and(eq(businessVerifications.businessId, businessId), inArray(businessVerifications.status, ["submitted", "under_review", "more_info_requested"])))
    .orderBy(desc(businessVerifications.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getBusinessDocuments(businessId: string) {
  return db
    .select()
    .from(businessDocuments)
    .where(and(eq(businessDocuments.businessId, businessId), sql`${businessDocuments.deletedAt} IS NULL`))
    .orderBy(desc(businessDocuments.createdAt));
}

/** Businesses that supply a commodity (used for RFQ matching by the buyer module). */
export async function getBusinessIdsForCommodity(commodityId: string, cityId?: string | null): Promise<string[]> {
  const rows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(
        eq(businesses.status, "active"),
        or(
          sql`EXISTS (SELECT 1 FROM business_commodities bc WHERE bc.business_id = ${businesses.id} AND bc.commodity_id = ${commodityId})`,
          sql`EXISTS (SELECT 1 FROM listings l WHERE l.business_id = ${businesses.id} AND l.commodity_id = ${commodityId} AND l.status = 'published')`,
        ),
      ),
    )
    .orderBy(cityId ? sql`CASE WHEN ${businesses.cityId} = ${cityId} THEN 0 ELSE 1 END` : businesses.createdAt)
    .limit(200);
  return rows.map((r) => r.id);
}
