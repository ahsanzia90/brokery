import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefinitions,
  businesses,
  commodities,
  commodityAliases,
  commodityGrades,
  commodityVarieties,
  listingAttributes,
  listingDocuments,
  listingImages,
  listings,
  locations,
  units,
} from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { ListingCardData } from "@/components/marketplace/cards";
import { normalizeText } from "@/lib/utils/text";
import { getDescendantCategoryIds } from "./taxonomy";
import { resolveLocationChain } from "./locations";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

export type ListingSort = "relevance" | "newest" | "price_asc" | "price_desc" | "updated";

export type ListingSearchParams = {
  q?: string | null;
  commodityId?: string | null;
  commoditySlug?: string | null;
  categoryId?: string | null;
  varietyId?: string | null;
  gradeId?: string | null;
  cityId?: string | null;
  provinceId?: string | null;
  businessId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  verifiedOnly?: boolean;
  freshnessDays?: number | null;
  priceType?: string | null;
  deliveryAvailable?: boolean;
  packaging?: string | null;
  attributeFilters?: Record<string, string>;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
};

export type ListingSearchResult = {
  items: ListingCardData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Set when price sorting restricted results to a single price unit. */
  priceUnitNote?: string | null;
  /** Commodity resolved from the free-text query (alias match). */
  matchedCommodityId?: string | null;
};

/** Build a prefix-matching tsquery from free text ("super basm" → 'super':* & 'basm':*). */
function toPrefixQuery(q: string): string {
  const words = normalizeText(q).split(" ").filter(Boolean).slice(0, 6);
  return words.map((w) => `${w.replace(/[':&|!()<>\\]/g, "")}:*`).join(" & ");
}

/** Resolve a free-text query to a commodity id when it matches a name/alias strongly. */
export async function resolveCommodityFromQuery(q: string): Promise<string | null> {
  const norm = normalizeText(q);
  if (!norm) return null;
  const [exact] = await db
    .select({ id: commodities.id })
    .from(commodities)
    .where(and(eq(commodities.status, "active"), or(sql`lower(${commodities.nameEn}) = ${norm}`, sql`${commodities.nameUr} = ${q.trim()}`)))
    .limit(1);
  if (exact) return exact.id;
  const [alias] = await db
    .select({ id: commodityAliases.commodityId })
    .from(commodityAliases)
    .innerJoin(commodities, eq(commodities.id, commodityAliases.commodityId))
    .where(and(eq(commodities.status, "active"), eq(commodityAliases.isApproved, true), or(eq(commodityAliases.normalized, norm), sql`similarity(${commodityAliases.normalized}, ${norm}) > 0.6`)))
    .orderBy(desc(sql`similarity(${commodityAliases.normalized}, ${norm})`))
    .limit(1);
  return alias?.id ?? null;
}

function mapCard(locale: Locale, r: {
  l: typeof listings.$inferSelect;
  commodity: typeof commodities.$inferSelect;
  variety: typeof commodityVarieties.$inferSelect | null;
  unit: typeof units.$inferSelect;
  city: typeof locations.$inferSelect | null;
  biz: typeof businesses.$inferSelect;
  priceUnit: string | null;
  image: string | null;
}): ListingCardData {
  return {
    id: r.l.id,
    slug: r.l.slug,
    title: r.l.title,
    commodityName: name(locale, r.commodity),
    commoditySlug: r.commodity.slug,
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
  };
}

const baseSelect = {
  l: listings,
  commodity: commodities,
  variety: commodityVarieties,
  unit: units,
  city: locations,
  biz: businesses,
  priceUnit: sql<string | null>`(SELECT symbol FROM units pu WHERE pu.id = ${listings.priceUnitId})`,
  image: sql<string | null>`(SELECT storage_path FROM listing_images li WHERE li.listing_id = ${listings.id} AND li.moderation_status <> 'rejected' ORDER BY li.sort_order LIMIT 1)`,
};

export async function searchListings(params: ListingSearchParams, locale: Locale): Promise<ListingSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
  const sort: ListingSort = params.sort ?? (params.q ? "relevance" : "newest");
  const conds: SQL[] = [eq(listings.status, "published"), eq(businesses.status, "active")];
  let matchedCommodityId: string | null = null;

  let commodityId = params.commodityId ?? null;
  if (!commodityId && params.commoditySlug) {
    const [c] = await db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, params.commoditySlug)).limit(1);
    commodityId = c?.id ?? null;
  }

  const q = params.q?.trim() ?? "";
  if (q) {
    matchedCommodityId = await resolveCommodityFromQuery(q);
    if (matchedCommodityId && !commodityId) {
      commodityId = matchedCommodityId;
    } else {
      const norm = normalizeText(q);
      const like = `%${norm}%`;
      const tsq = toPrefixQuery(q);
      conds.push(
        or(
          tsq ? sql`${listings.searchVector} @@ to_tsquery('simple', ${tsq})` : sql`false`,
          ilike(commodities.nameEn, like),
          sql`${commodities.nameUr} ILIKE ${like}`,
          sql`${commodityVarieties.nameEn} ILIKE ${like}`,
          ilike(businesses.name, like),
          sql`EXISTS (SELECT 1 FROM commodity_aliases ca WHERE ca.commodity_id = ${listings.commodityId} AND ca.normalized ILIKE ${like})`,
          sql`similarity(lower(${listings.title}), ${norm}) > 0.25`,
        )!,
      );
    }
  }

  if (commodityId) conds.push(eq(listings.commodityId, commodityId));
  if (params.categoryId) {
    const ids = await getDescendantCategoryIds(params.categoryId);
    conds.push(inArray(commodities.categoryId, ids));
  }
  if (params.varietyId) conds.push(eq(listings.varietyId, params.varietyId));
  if (params.gradeId) conds.push(eq(listings.gradeId, params.gradeId));
  if (params.cityId) conds.push(or(eq(listings.cityId, params.cityId), eq(listings.marketId, params.cityId))!);
  if (params.provinceId) conds.push(eq(listings.provinceId, params.provinceId));
  if (params.businessId) conds.push(eq(listings.businessId, params.businessId));
  if (params.minPrice != null) conds.push(gte(listings.priceAmount, String(params.minPrice)));
  if (params.maxPrice != null) conds.push(lte(listings.priceAmount, String(params.maxPrice)));
  if (params.verifiedOnly) conds.push(inArray(businesses.verificationLevel, ["phone_verified", "documents_reviewed", "admin_verified"]));
  if (params.freshnessDays) conds.push(gte(listings.publishedAt, sql`now() - make_interval(days => ${params.freshnessDays})`));
  if (params.priceType && ["fixed", "negotiable", "quote", "on_contact"].includes(params.priceType)) conds.push(eq(listings.priceType, params.priceType as "fixed"));
  if (params.deliveryAvailable) conds.push(eq(listings.deliveryAvailable, "yes"));
  if (params.packaging) conds.push(ilike(listings.packaging, `%${params.packaging}%`));
  if (params.attributeFilters) {
    for (const [key, value] of Object.entries(params.attributeFilters)) {
      if (!value) continue;
      conds.push(
        sql`EXISTS (SELECT 1 FROM listing_attributes la JOIN attribute_definitions ad ON ad.id = la.attribute_id WHERE la.listing_id = ${listings.id} AND ad.key = ${key} AND (la.value_text ILIKE ${"%" + value + "%"} OR la.value_number::text = ${value}))`,
      );
    }
  }

  let priceUnitNote: string | null = null;
  if (sort === "price_asc" || sort === "price_desc") {
    // Never compare incompatible units: restrict to the most common price unit among matches.
    conds.push(sql`${listings.priceAmount} IS NOT NULL`);
    const [top] = await db
      .select({ unitId: listings.priceUnitId, n: sql<number>`count(*)` })
      .from(listings)
      .innerJoin(commodities, eq(commodities.id, listings.commodityId))
      .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
      .innerJoin(businesses, eq(businesses.id, listings.businessId))
      .where(and(...conds))
      .groupBy(listings.priceUnitId)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
    if (top?.unitId) {
      conds.push(eq(listings.priceUnitId, top.unitId));
      const [u] = await db.select({ symbol: units.symbol }).from(units).where(eq(units.id, top.unitId));
      priceUnitNote = u?.symbol ?? null;
    }
  }

  const where = and(...conds);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(where);

  const orderBy =
    sort === "price_asc"
      ? [asc(listings.priceAmount), desc(listings.publishedAt)]
      : sort === "price_desc"
        ? [desc(listings.priceAmount), desc(listings.publishedAt)]
        : sort === "updated"
          ? [desc(listings.lastRefreshedAt)]
          : sort === "relevance" && q
            ? [desc(sql`ts_rank(${listings.searchVector}, to_tsquery('simple', ${toPrefixQuery(q) || "x:*"}))`), desc(listings.isFeatured), desc(listings.publishedAt)]
            : [desc(listings.isFeatured), desc(listings.publishedAt)];

  const rows = await db
    .select(baseSelect)
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalNum = Number(total);
  return {
    items: rows.map((r) => mapCard(locale, r)),
    total: totalNum,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalNum / pageSize)),
    priceUnitNote,
    matchedCommodityId,
  };
}

export type ListingDetail = {
  listing: typeof listings.$inferSelect;
  commodity: typeof commodities.$inferSelect;
  variety: typeof commodityVarieties.$inferSelect | null;
  grade: typeof commodityGrades.$inferSelect | null;
  unit: typeof units.$inferSelect;
  priceUnit: typeof units.$inferSelect | null;
  minOrderUnit: typeof units.$inferSelect | null;
  location: { province: string | null; district: string | null; city: string | null; market: string | null; citySlug: string | null };
  business: {
    id: string;
    slug: string;
    name: string;
    businessType: string;
    verificationLevel: string;
    cityName: string | null;
    logoPath: string | null;
    description: string | null;
    /** true when a number exists AND the seller consented to show it on this listing */
    phoneAvailable: boolean;
    whatsappAvailable: boolean;
    ownerId: string;
  };
  images: Array<typeof listingImages.$inferSelect>;
  attributes: Array<{ key: string; label: string; value: string; unitLabel: string | null }>;
  documents: Array<typeof listingDocuments.$inferSelect>;
};

export async function getListingBySlug(slug: string, locale: Locale): Promise<ListingDetail | null> {
  const [row] = await db
    .select({ l: listings, commodity: commodities, variety: commodityVarieties, grade: commodityGrades, unit: units, biz: businesses })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, listings.gradeId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(eq(listings.slug, slug))
    .limit(1);
  if (!row) return null;
  const unitIds = [row.l.priceUnitId, row.l.minOrderUnitId].filter((x): x is string => Boolean(x));
  const extraUnits = unitIds.length ? await db.select().from(units).where(inArray(units.id, unitIds)) : [];
  const chain = await resolveLocationChain(row.l.marketId ?? row.l.cityId ?? row.l.districtId ?? row.l.provinceId);
  const bizCity = row.biz.cityId ? (await resolveLocationChain(row.biz.cityId)).city : null;
  const images = await db.select().from(listingImages).where(and(eq(listingImages.listingId, row.l.id), ne(listingImages.moderationStatus, "rejected"))).orderBy(asc(listingImages.sortOrder));
  const attrs = await db
    .select({ a: listingAttributes, d: attributeDefinitions })
    .from(listingAttributes)
    .innerJoin(attributeDefinitions, eq(attributeDefinitions.id, listingAttributes.attributeId))
    .where(eq(listingAttributes.listingId, row.l.id));
  const docs = await db.select().from(listingDocuments).where(and(eq(listingDocuments.listingId, row.l.id), eq(listingDocuments.isPublic, true)));
  return {
    listing: row.l,
    commodity: row.commodity,
    variety: row.variety,
    grade: row.grade,
    unit: row.unit,
    priceUnit: extraUnits.find((u) => u.id === row.l.priceUnitId) ?? null,
    minOrderUnit: extraUnits.find((u) => u.id === row.l.minOrderUnitId) ?? null,
    location: {
      province: chain.province ? name(locale, chain.province) : null,
      district: chain.district ? name(locale, chain.district) : null,
      city: chain.city ? name(locale, chain.city) : null,
      market: chain.market ? name(locale, chain.market) : null,
      citySlug: chain.city?.slug ?? null,
    },
    business: {
      id: row.biz.id,
      slug: row.biz.slug,
      name: row.biz.name,
      businessType: row.biz.businessType,
      verificationLevel: row.biz.verificationLevel,
      cityName: bizCity ? name(locale, bizCity) : null,
      logoPath: row.biz.logoPath,
      description: row.biz.description,
      phoneAvailable: Boolean(row.biz.publicPhone && row.biz.showPhonePublicly && row.l.contactPhoneEnabled),
      whatsappAvailable: Boolean(row.biz.whatsappNumber && row.biz.showWhatsappPublicly && row.l.contactWhatsappEnabled),
      ownerId: row.biz.ownerId,
    },
    images,
    attributes: attrs.map(({ a, d }) => ({
      key: d.key,
      label: name(locale, d),
      value: a.valueText ?? (a.valueNumber != null ? String(Number(a.valueNumber)) : a.valueBoolean != null ? (a.valueBoolean ? "✓" : "✗") : a.valueDate ?? ""),
      unitLabel: d.unitLabel,
    })),
    documents: docs,
  };
}

export async function getSimilarListings(detail: ListingDetail, locale: Locale, limit = 6): Promise<ListingCardData[]> {
  const rows = await db
    .select(baseSelect)
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(and(eq(listings.status, "published"), eq(businesses.status, "active"), eq(listings.commodityId, detail.commodity.id), ne(listings.id, detail.listing.id)))
    .orderBy(desc(sql`${listings.cityId} = ${detail.listing.cityId ?? null}`), desc(listings.publishedAt))
    .limit(limit);
  return rows.map((r) => mapCard(locale, r));
}

export async function getListingCountForCommodity(commodityId: string, cityId?: string | null): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(listings)
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(and(eq(listings.status, "published"), eq(businesses.status, "active"), eq(listings.commodityId, commodityId), cityId ? eq(listings.cityId, cityId) : undefined));
  return Number(r?.n ?? 0);
}

export async function getListingCountsByCommodity(commodityIds: string[]): Promise<Map<string, number>> {
  if (!commodityIds.length) return new Map();
  const rows = await db
    .select({ id: listings.commodityId, n: sql<number>`count(*)` })
    .from(listings)
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .where(and(eq(listings.status, "published"), eq(businesses.status, "active"), inArray(listings.commodityId, commodityIds)))
    .groupBy(listings.commodityId);
  return new Map(rows.map((r) => [r.id, Number(r.n)]));
}

/** Increment view count (fire-and-forget; callers must not await failures). */
export async function bumpListingViews(listingId: string): Promise<void> {
  await db.update(listings).set({ viewCount: sql`${listings.viewCount} + 1` }).where(eq(listings.id, listingId));
}

