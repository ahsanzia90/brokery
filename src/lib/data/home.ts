import "server-only";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  businessCommodities,
  businesses,
  commodities,
  commodityGrades,
  commodityVarieties,
  contentPages,
  homepageSections,
  listingImages,
  listings,
  locations,
  marketPrices,
  priceSources,
  units,
} from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { ListingCardData, PriceRowData, SupplierCardData } from "@/components/marketplace/cards";
import { daysBetween } from "@/lib/utils/format";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

export async function getHomepageSections() {
  return db.select().from(homepageSections).where(eq(homepageSections.isEnabled, true)).orderBy(homepageSections.sortOrder);
}

export async function getRecentListings(locale: Locale, limit = 6, where?: ReturnType<typeof and>): Promise<ListingCardData[]> {
  const rows = await db
    .select({
      l: listings,
      commodity: commodities,
      variety: commodityVarieties,
      unit: units,
      city: locations,
      biz: businesses,
      priceUnit: sql<string | null>`(SELECT symbol FROM units pu WHERE pu.id = ${listings.priceUnitId})`,
      image: sql<string | null>`(SELECT storage_path FROM listing_images li WHERE li.listing_id = ${listings.id} AND li.moderation_status <> 'rejected' ORDER BY li.sort_order LIMIT 1)`,
    })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(and(eq(listings.status, "published"), eq(businesses.status, "active"), where))
    .orderBy(desc(listings.publishedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.l.id,
    slug: r.l.slug,
    title: r.l.title,
    commodityName: name(locale, r.commodity),
    varietyName: r.variety ? name(locale, r.variety) : r.l.customVariety,
    priceType: r.l.priceType,
    priceAmount: r.l.priceAmount,
    priceUnitSymbol: r.priceUnit,
    quantity: r.l.quantity,
    unitSymbol: r.unit.symbol,
    cityName: r.city ? name(locale, r.city) : null,
    imagePath: r.image,
    businessName: r.biz.name,
    businessSlug: r.biz.slug,
    verificationLevel: r.biz.verificationLevel,
    publishedAt: r.l.publishedAt,
  }));
}

export async function getTodaysRates(locale: Locale, staleDays: number, limit = 8): Promise<PriceRowData[]> {
  const rows = await db
    .select({ p: marketPrices, commodity: commodities, variety: commodityVarieties, grade: commodityGrades, loc: locations, unit: units, source: priceSources })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, marketPrices.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, marketPrices.gradeId))
    .innerJoin(locations, eq(locations.id, marketPrices.locationId))
    .innerJoin(units, eq(units.id, marketPrices.unitId))
    .leftJoin(priceSources, eq(priceSources.id, marketPrices.sourceId))
    .where(and(eq(marketPrices.status, "published"), gte(marketPrices.observationDate, sql`(current_date - ${staleDays}::int)::date`), sql`(${marketPrices.validUntil} IS NULL OR ${marketPrices.validUntil} > now())`))
    .orderBy(desc(marketPrices.observationDate), commodities.sortOrder)
    .limit(limit);
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

export async function getFeaturedSuppliers(locale: Locale, limit = 6): Promise<SupplierCardData[]> {
  const rows = await db
    .select({ b: businesses, city: locations, listingCount: sql<number>`(SELECT count(*) FROM listings l WHERE l.business_id = ${businesses.id} AND l.status = 'published')` })
    .from(businesses)
    .leftJoin(locations, eq(locations.id, businesses.cityId))
    .where(and(eq(businesses.status, "active"), inArray(businesses.verificationLevel, ["documents_reviewed", "admin_verified"])))
    .orderBy(desc(businesses.isFeatured), desc(businesses.verificationLevel), desc(businesses.updatedAt))
    .limit(limit);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.b.id);
  const comms = await db
    .select({ businessId: businessCommodities.businessId, c: commodities })
    .from(businessCommodities)
    .innerJoin(commodities, eq(commodities.id, businessCommodities.commodityId))
    .where(inArray(businessCommodities.businessId, ids));
  return rows.map((r) => ({
    id: r.b.id,
    slug: r.b.slug,
    name: r.b.name,
    businessType: r.b.businessType,
    cityName: r.city ? name(locale, r.city) : null,
    verificationLevel: r.b.verificationLevel,
    logoPath: r.b.logoPath,
    listingCount: Number(r.listingCount),
    commodities: comms.filter((c) => c.businessId === r.b.id).slice(0, 4).map((c) => name(locale, c.c)),
  }));
}

export async function getPublishedGuides(limit = 3) {
  return db
    .select({ slug: contentPages.slug, titleEn: contentPages.titleEn, titleUr: contentPages.titleUr, excerptEn: contentPages.excerptEn, excerptUr: contentPages.excerptUr, publishedAt: contentPages.publishedAt })
    .from(contentPages)
    .where(and(eq(contentPages.kind, "guide"), eq(contentPages.status, "published")))
    .orderBy(desc(contentPages.publishedAt))
    .limit(limit);
}

export async function getFeaturedCategories() {
  const { getCategoryTree } = await import("./taxonomy");
  const tree = await getCategoryTree();
  const featured = tree.filter((c) => c.isFeatured);
  return (featured.length ? featured : tree).slice(0, 8);
}

export async function getListingCountsByCategory(): Promise<Map<string, number>> {
  const rows = await db
    .select({ categoryId: commodities.categoryId, n: count() })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .where(eq(listings.status, "published"))
    .groupBy(commodities.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.n]));
}
