import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, lte, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import {
  analyticsEvents,
  businessVerifications,
  businesses,
  categories,
  commodities,
  listingReports,
  listings,
  locations,
  marketPrices,
  profiles,
  rfqs,
  searchLogs,
  supplierQuotes,
  supportCases,
  userRoles,
} from "@/db/schema";
import { getSetting } from "@/lib/config/settings";

export type DateRange = { from: Date; to: Date };

export function parseRange(from?: string, to?: string): DateRange {
  const toDate = to && !Number.isNaN(Date.parse(to)) ? new Date(to + "T23:59:59.999Z") : new Date();
  const fromDate = from && !Number.isNaN(Date.parse(from)) ? new Date(from + "T00:00:00.000Z") : new Date(toDate.getTime() - 30 * 86_400_000);
  return { from: fromDate, to: toDate };
}

async function one<T extends { n: number }>(q: Promise<T[]>): Promise<number> {
  const [r] = await q;
  return Number(r?.n ?? 0);
}

export async function getDashboardMetrics(range: DateRange) {
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const inRange = (col: AnyColumn) => and(gte(col, range.from), lte(col, range.to));

  const [
    totalUsers,
    buyers,
    sellers,
    verifiedSuppliers,
    activeBusinesses,
    publishedListings,
    pendingListings,
    pendingVerifications,
    rfqTotal,
    rfqOpen,
    rfqAwaiting,
    quotesSent,
    publishedPrices,
    stalePrices,
    openCases,
    openReports,
    newUsersInRange,
    listingsInRange,
    rfqsInRange,
  ] = await Promise.all([
    one(db.select({ n: count() }).from(profiles).where(sql`${profiles.status} <> 'deleted'`)),
    one(db.select({ n: count() }).from(profiles).where(and(eq(profiles.isBuyer, true), sql`${profiles.status} <> 'deleted'`))),
    one(db.select({ n: count() }).from(profiles).where(and(eq(profiles.isSeller, true), sql`${profiles.status} <> 'deleted'`))),
    one(db.select({ n: count() }).from(businesses).where(and(eq(businesses.status, "active"), inArray(businesses.verificationLevel, ["documents_reviewed", "admin_verified"])))),
    one(db.select({ n: count() }).from(businesses).where(eq(businesses.status, "active"))),
    one(db.select({ n: count() }).from(listings).where(eq(listings.status, "published"))),
    one(db.select({ n: count() }).from(listings).where(eq(listings.status, "pending_review"))),
    one(db.select({ n: count() }).from(businessVerifications).where(inArray(businessVerifications.status, ["submitted", "under_review"]))),
    one(db.select({ n: count() }).from(rfqs)),
    one(db.select({ n: count() }).from(rfqs).where(inArray(rfqs.status, ["submitted", "matching", "responses_received", "in_discussion"]))),
    one(db.select({ n: count() }).from(rfqs).where(inArray(rfqs.status, ["submitted", "matching"]))),
    one(db.select({ n: count() }).from(supplierQuotes)),
    one(db.select({ n: count() }).from(marketPrices).where(eq(marketPrices.status, "published"))),
    one(db.select({ n: count() }).from(marketPrices).where(and(eq(marketPrices.status, "published"), sql`${marketPrices.observationDate} < (current_date - ${staleDays}::int)::date`))),
    one(db.select({ n: count() }).from(supportCases).where(inArray(supportCases.status, ["open", "in_progress", "waiting_on_user"]))),
    one(db.select({ n: count() }).from(listingReports).where(inArray(listingReports.status, ["open", "under_review"]))),
    one(db.select({ n: count() }).from(profiles).where(inRange(profiles.createdAt))),
    one(db.select({ n: count() }).from(listings).where(inRange(listings.createdAt))),
    one(db.select({ n: count() }).from(rfqs).where(inRange(rfqs.createdAt))),
  ]);

  const registrationsByWeek = await db
    .select({ week: sql<string>`to_char(date_trunc('week', ${profiles.createdAt}), 'YYYY-MM-DD')`, n: count() })
    .from(profiles)
    .where(inRange(profiles.createdAt))
    .groupBy(sql`date_trunc('week', ${profiles.createdAt})`)
    .orderBy(sql`date_trunc('week', ${profiles.createdAt})`);

  // Top-level category for a commodity: walk up via a recursive CTE.
  const topCategorySql = sql<string>`(
    WITH RECURSIVE up AS (
      SELECT c.id, c.parent_id, c.name_en FROM categories c WHERE c.id = ${commodities.categoryId}
      UNION ALL SELECT p.id, p.parent_id, p.name_en FROM categories p JOIN up ON up.parent_id = p.id
    ) SELECT name_en FROM up WHERE parent_id IS NULL LIMIT 1)`;

  const listingsByCategory = await db
    .select({ name: topCategorySql, n: count() })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .where(inRange(listings.createdAt))
    .groupBy(topCategorySql)
    .orderBy(desc(count()))
    .limit(8);

  const rfqsByCategory = await db
    .select({ name: topCategorySql, n: count() })
    .from(rfqs)
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .where(inRange(rfqs.createdAt))
    .groupBy(topCategorySql)
    .orderBy(desc(count()))
    .limit(8);

  const listingsByCity = await db
    .select({ name: locations.nameEn, n: count() })
    .from(listings)
    .innerJoin(locations, eq(locations.id, listings.cityId))
    .where(inRange(listings.createdAt))
    .groupBy(locations.nameEn)
    .orderBy(desc(count()))
    .limit(8);

  const rfqsByCity = await db
    .select({ name: locations.nameEn, n: count() })
    .from(rfqs)
    .innerJoin(locations, eq(locations.id, rfqs.cityId))
    .where(inRange(rfqs.createdAt))
    .groupBy(locations.nameEn)
    .orderBy(desc(count()))
    .limit(8);

  const zeroResultSearches = await db
    .select({ q: sql<string>`min(${searchLogs.queryText})`, n: count() })
    .from(searchLogs)
    .where(and(eq(searchLogs.resultCount, 0), gte(searchLogs.createdAt, range.from), lte(searchLogs.createdAt, range.to)))
    .groupBy(searchLogs.normalized)
    .orderBy(desc(count()))
    .limit(10);

  const eventCounts = await db
    .select({ name: analyticsEvents.eventName, n: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.isBot, false), inArray(analyticsEvents.eventName, ["search", "zero_result_search", "listing_view", "contact_click", "rfq_created", "home_buy_click", "home_sell_click", "supplier_view"]), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))
    .groupBy(analyticsEvents.eventName);

  const adminCount = await one(db.select({ n: count() }).from(userRoles).where(inArray(userRoles.role, ["super_admin", "taxonomy_manager", "price_editor", "listing_moderator", "verification_reviewer", "content_editor", "support_agent"])));

  return {
    staleDays,
    totals: { totalUsers, buyers, sellers, verifiedSuppliers, activeBusinesses, publishedListings, pendingListings, pendingVerifications, rfqTotal, rfqOpen, rfqAwaiting, quotesSent, publishedPrices, stalePrices, openCases, openReports, adminCount },
    range: { newUsersInRange, listingsInRange, rfqsInRange },
    registrationsByWeek: registrationsByWeek.map((r) => ({ week: r.week, n: Number(r.n) })),
    listingsByCategory: listingsByCategory.map((r) => ({ name: r.name ?? "Uncategorised", n: Number(r.n) })),
    rfqsByCategory: rfqsByCategory.map((r) => ({ name: r.name ?? "Uncategorised", n: Number(r.n) })),
    listingsByCity: listingsByCity.map((r) => ({ name: r.name, n: Number(r.n) })),
    rfqsByCity: rfqsByCity.map((r) => ({ name: r.name, n: Number(r.n) })),
    zeroResultSearches: zeroResultSearches.map((r) => ({ q: r.q, n: Number(r.n) })),
    eventCounts: Object.fromEntries(eventCounts.map((e) => [e.name, Number(e.n)])) as Record<string, number>,
  };
}

export async function getNotificationStats() {
  const { notifications } = await import("@/db/schema");
  const byChannel = await db
    .select({ channel: notifications.channel, status: notifications.deliveryStatus, n: count() })
    .from(notifications)
    .groupBy(notifications.channel, notifications.deliveryStatus)
    .orderBy(notifications.channel, notifications.deliveryStatus);
  const failed = await db
    .select({ id: notifications.id, channel: notifications.channel, type: notifications.type, error: notifications.deliveryError, createdAt: notifications.createdAt, userId: notifications.userId })
    .from(notifications)
    .where(and(inArray(notifications.deliveryStatus, ["failed", "skipped"]), isNull(notifications.sentAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return { byChannel: byChannel.map((r) => ({ ...r, n: Number(r.n) })), failed };
}
