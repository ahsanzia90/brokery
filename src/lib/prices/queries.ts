import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { commodities, commodityGrades, commodityVarieties, locations, marketPrices, priceHistory, priceSources, profiles, units } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { PriceRowData } from "@/components/marketplace/cards";
import { daysBetween } from "@/lib/utils/format";

export type PriceStatus = (typeof marketPrices.$inferSelect)["status"];
export type PriceType = (typeof marketPrices.$inferSelect)["priceType"];

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

/** Joined selection used by every price query. */
const joined = () =>
  db
    .select({ p: marketPrices, commodity: commodities, variety: commodityVarieties, grade: commodityGrades, loc: locations, unit: units, source: priceSources })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, marketPrices.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, marketPrices.gradeId))
    .innerJoin(locations, eq(locations.id, marketPrices.locationId))
    .innerJoin(units, eq(units.id, marketPrices.unitId))
    .leftJoin(priceSources, eq(priceSources.id, marketPrices.sourceId));

export type JoinedPriceRow = Awaited<ReturnType<ReturnType<typeof joined>["execute"]>>[number];

export function toPriceRow(r: JoinedPriceRow, locale: Locale, staleDays: number): PriceRowData {
  return {
    id: r.p.id,
    commodityName: name(locale, r.commodity),
    commoditySlug: r.commodity.slug,
    varietyName: r.variety ? name(locale, r.variety) : null,
    gradeName: r.grade ? name(locale, r.grade) : null,
    locationName: name(locale, r.loc),
    locationSlug: r.loc.type === "city" ? r.loc.slug : null,
    amount: r.p.amount,
    lowAmount: r.p.lowAmount,
    highAmount: r.p.highAmount,
    unitSymbol: r.unit.symbol,
    priceType: r.p.priceType,
    observationDate: r.p.observationDate,
    sourceName: r.source?.name ?? null,
    changePercent: r.p.changePercent,
    isStale: daysBetween(new Date(), new Date(r.p.observationDate)) > staleDays,
  };
}

/** Condition for "fresh today's rate": published, observed within staleDays, not past validUntil. */
export function freshCondition(staleDays: number): SQL {
  return and(
    eq(marketPrices.status, "published"),
    gte(marketPrices.observationDate, sql`(current_date - ${staleDays}::int)::date`),
    or(isNull(marketPrices.validUntil), sql`${marketPrices.validUntil} > now()`),
  )!;
}

/** Published but older than staleDays (still shown as "older rate"). */
export function staleCondition(staleDays: number): SQL {
  return and(eq(marketPrices.status, "published"), lt(marketPrices.observationDate, sql`(current_date - ${staleDays}::int)::date`))!;
}

export async function getLatestPublishedPrices(
  opts: { commodityId?: string | null; locationId?: string | null; varietyId?: string | null; priceType?: PriceType | null; includeStale?: boolean; onlyStale?: boolean; page?: number; pageSize?: number },
  locale: Locale,
  staleDays: number,
): Promise<{ items: PriceRowData[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 40));
  const conds: SQL[] = [];
  if (opts.onlyStale) conds.push(staleCondition(staleDays));
  else if (opts.includeStale) conds.push(eq(marketPrices.status, "published"));
  else conds.push(freshCondition(staleDays));
  if (opts.commodityId) conds.push(eq(marketPrices.commodityId, opts.commodityId));
  if (opts.locationId) conds.push(eq(marketPrices.locationId, opts.locationId));
  if (opts.varietyId) conds.push(eq(marketPrices.varietyId, opts.varietyId));
  if (opts.priceType) conds.push(eq(marketPrices.priceType, opts.priceType));
  const where = and(...conds);
  const [{ n }] = await db.select({ n: count() }).from(marketPrices).where(where);
  const rows = await joined()
    .where(where)
    .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn), asc(locations.nameEn), asc(commodityVarieties.sortOrder), desc(marketPrices.observationDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { items: rows.map((r) => toPriceRow(r, locale, staleDays)), total: n, page, pageSize, totalPages: Math.max(1, Math.ceil(n / pageSize)) };
}

/** History of a price key (all statuses except draft/rejected), newest first. */
export async function getPriceHistory(
  key: { commodityId: string; varietyId?: string | null; gradeId?: string | null; locationId?: string | null; unitId?: string | null; priceType?: PriceType | null },
  locale: Locale,
  staleDays: number,
  limit = 30,
): Promise<Array<PriceRowData & { status: PriceStatus; publishedAt: Date | null; previousAmount: string | null }>> {
  const conds: SQL[] = [eq(marketPrices.commodityId, key.commodityId), inArray(marketPrices.status, ["published", "superseded", "expired"])];
  if (key.varietyId) conds.push(eq(marketPrices.varietyId, key.varietyId));
  if (key.gradeId) conds.push(eq(marketPrices.gradeId, key.gradeId));
  if (key.locationId) conds.push(eq(marketPrices.locationId, key.locationId));
  if (key.unitId) conds.push(eq(marketPrices.unitId, key.unitId));
  if (key.priceType) conds.push(eq(marketPrices.priceType, key.priceType));
  const rows = await joined().where(and(...conds)).orderBy(desc(marketPrices.observationDate), desc(marketPrices.createdAt)).limit(limit);
  return rows.map((r) => ({ ...toPriceRow(r, locale, staleDays), status: r.p.status, publishedAt: r.p.publishedAt, previousAmount: r.p.previousAmount }));
}

export async function getCommoditiesWithPrices(): Promise<Array<{ id: string; slug: string; nameEn: string; nameUr: string | null; n: number }>> {
  return db
    .select({ id: commodities.id, slug: commodities.slug, nameEn: commodities.nameEn, nameUr: commodities.nameUr, n: count() })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .where(eq(marketPrices.status, "published"))
    .groupBy(commodities.id, commodities.slug, commodities.nameEn, commodities.nameUr, commodities.sortOrder)
    .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn));
}

export async function getCitiesWithPrices(commodityId?: string | null): Promise<Array<{ id: string; slug: string; type: string; nameEn: string; nameUr: string | null; n: number }>> {
  const conds: SQL[] = [eq(marketPrices.status, "published")];
  if (commodityId) conds.push(eq(marketPrices.commodityId, commodityId));
  return db
    .select({ id: locations.id, slug: locations.slug, type: locations.type, nameEn: locations.nameEn, nameUr: locations.nameUr, n: count() })
    .from(marketPrices)
    .innerJoin(locations, eq(locations.id, marketPrices.locationId))
    .where(and(...conds))
    .groupBy(locations.id, locations.slug, locations.type, locations.nameEn, locations.nameUr)
    .orderBy(desc(locations.isMajorMarket), asc(locations.nameEn));
}

export async function getStalePrices(staleDays: number, limit = 200) {
  return joined().where(staleCondition(staleDays)).orderBy(asc(marketPrices.observationDate)).limit(limit);
}

export async function countStalePrices(staleDays: number): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(marketPrices).where(staleCondition(staleDays));
  return n;
}

export async function getPriceById(id: string) {
  const [row] = await joined().where(eq(marketPrices.id, id)).limit(1);
  return row ?? null;
}

export async function getPriceVersions(priceId: string) {
  return db
    .select({ h: priceHistory, actorName: profiles.name })
    .from(priceHistory)
    .leftJoin(profiles, eq(profiles.id, priceHistory.actorId))
    .where(eq(priceHistory.priceId, priceId))
    .orderBy(asc(priceHistory.version));
}

/** Admin list with filters. */
export async function listPricesAdmin(opts: {
  status?: PriceStatus | "";
  commodityId?: string;
  locationId?: string;
  priceType?: PriceType | "";
  from?: string;
  to?: string;
  staleOnly?: boolean;
  staleDays: number;
  page: number;
  pageSize?: number;
}) {
  const pageSize = opts.pageSize ?? 30;
  const conds: SQL[] = [];
  if (opts.staleOnly) conds.push(staleCondition(opts.staleDays));
  else if (opts.status) conds.push(eq(marketPrices.status, opts.status));
  if (opts.commodityId) conds.push(eq(marketPrices.commodityId, opts.commodityId));
  if (opts.locationId) conds.push(eq(marketPrices.locationId, opts.locationId));
  if (opts.priceType) conds.push(eq(marketPrices.priceType, opts.priceType));
  if (opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from)) conds.push(gte(marketPrices.observationDate, opts.from));
  if (opts.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to)) conds.push(lte(marketPrices.observationDate, opts.to));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n }] = await db.select({ n: count() }).from(marketPrices).where(where);
  const rows = await db
    .select({ p: marketPrices, commodity: commodities, variety: commodityVarieties, grade: commodityGrades, loc: locations, unit: units, source: priceSources, reviewer: profiles })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, marketPrices.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, marketPrices.gradeId))
    .innerJoin(locations, eq(locations.id, marketPrices.locationId))
    .innerJoin(units, eq(units.id, marketPrices.unitId))
    .leftJoin(priceSources, eq(priceSources.id, marketPrices.sourceId))
    .leftJoin(profiles, eq(profiles.id, marketPrices.reviewerId))
    .where(where)
    .orderBy(desc(marketPrices.updatedAt))
    .limit(pageSize)
    .offset((opts.page - 1) * pageSize);
  return { rows, total: n, totalPages: Math.max(1, Math.ceil(n / pageSize)) };
}

export async function getPriceSources(activeOnly = false) {
  return db
    .select()
    .from(priceSources)
    .where(activeOnly ? eq(priceSources.isActive, 1) : undefined)
    .orderBy(asc(priceSources.name));
}

export async function getPriceStatusCounts(): Promise<Record<string, number>> {
  const rows = await db.select({ status: marketPrices.status, n: count() }).from(marketPrices).groupBy(marketPrices.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}
