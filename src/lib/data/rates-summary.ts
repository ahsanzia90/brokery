import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { commodities, commodityGrades, commodityVarieties, locations, marketPrices, priceSources, units } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { PriceRowData } from "@/components/marketplace/cards";
import { daysBetween } from "@/lib/utils/format";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

/**
 * Latest published price per (commodity, variety, grade, location, unit, price type).
 * Used by public browse pages; the full price module lives under /prices.
 */
export async function getLatestPublishedRates(opts: { commodityId?: string | null; commodityIds?: string[] | null; locationIds?: string[] | null; varietyId?: string | null; limit?: number }, locale: Locale, staleDays: number): Promise<PriceRowData[]> {
  const conds = [eq(marketPrices.status, "published"), sql`(${marketPrices.validUntil} IS NULL OR ${marketPrices.validUntil} > now())`];
  if (opts.commodityId) conds.push(eq(marketPrices.commodityId, opts.commodityId));
  if (opts.commodityIds?.length) conds.push(inArray(marketPrices.commodityId, opts.commodityIds));
  if (opts.locationIds?.length) conds.push(inArray(marketPrices.locationId, opts.locationIds));
  if (opts.varietyId) conds.push(eq(marketPrices.varietyId, opts.varietyId));
  const rows = await db
    .select({ p: marketPrices, commodity: commodities, variety: commodityVarieties, grade: commodityGrades, loc: locations, unit: units, source: priceSources })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, marketPrices.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, marketPrices.gradeId))
    .innerJoin(locations, eq(locations.id, marketPrices.locationId))
    .innerJoin(units, eq(units.id, marketPrices.unitId))
    .leftJoin(priceSources, eq(priceSources.id, marketPrices.sourceId))
    .where(and(...conds))
    .orderBy(desc(marketPrices.observationDate), commodities.sortOrder)
    .limit(opts.limit ?? 24);
  return rows.map((r) => ({
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
  }));
}

export async function countPublishedRates(commodityId: string, locationIds?: string[] | null, varietyId?: string | null): Promise<number> {
  const conds = [eq(marketPrices.status, "published"), eq(marketPrices.commodityId, commodityId)];
  if (locationIds?.length) conds.push(inArray(marketPrices.locationId, locationIds));
  if (varietyId) conds.push(eq(marketPrices.varietyId, varietyId));
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(marketPrices).where(and(...conds));
  return Number(r?.n ?? 0);
}
