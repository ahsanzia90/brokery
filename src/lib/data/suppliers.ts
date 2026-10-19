import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { businessCommodities, businesses, commodities, listings, locations } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { SupplierCardData } from "@/components/marketplace/cards";
import { resolveLocationChain } from "./locations";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

export type SupplierSearchParams = {
  q?: string | null;
  cityId?: string | null;
  provinceId?: string | null;
  commodityId?: string | null;
  categoryId?: string | null;
  verificationLevels?: string[] | null;
  page?: number;
  pageSize?: number;
};

export async function searchSuppliers(params: SupplierSearchParams, locale: Locale) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 18));
  const conds: SQL[] = [eq(businesses.status, "active")];
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    conds.push(or(ilike(businesses.name, like), sql`similarity(lower(${businesses.name}), lower(${params.q.trim()})) > 0.3`, ilike(businesses.description, like))!);
  }
  if (params.cityId) conds.push(or(eq(businesses.cityId, params.cityId), eq(businesses.marketId, params.cityId))!);
  if (params.provinceId) conds.push(eq(businesses.provinceId, params.provinceId));
  if (params.commodityId) {
    conds.push(
      or(
        sql`EXISTS (SELECT 1 FROM business_commodities bc WHERE bc.business_id = ${businesses.id} AND bc.commodity_id = ${params.commodityId})`,
        sql`EXISTS (SELECT 1 FROM listings l WHERE l.business_id = ${businesses.id} AND l.commodity_id = ${params.commodityId} AND l.status = 'published')`,
      )!,
    );
  }
  if (params.categoryId) {
    const { getDescendantCategoryIds } = await import("./taxonomy");
    const ids = await getDescendantCategoryIds(params.categoryId);
    conds.push(
      or(
        sql`EXISTS (SELECT 1 FROM business_commodities bc JOIN commodities c ON c.id = bc.commodity_id WHERE bc.business_id = ${businesses.id} AND c.category_id IN ${ids})`,
        sql`EXISTS (SELECT 1 FROM listings l JOIN commodities c ON c.id = l.commodity_id WHERE l.business_id = ${businesses.id} AND l.status = 'published' AND c.category_id IN ${ids})`,
      )!,
    );
  }
  if (params.verificationLevels?.length) conds.push(inArray(businesses.verificationLevel, params.verificationLevels as Array<"none">));
  const where = and(...conds);
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(businesses).where(where);
  const rows = await db
    .select({ b: businesses, city: locations, listingCount: sql<number>`(SELECT count(*) FROM listings l WHERE l.business_id = ${businesses.id} AND l.status = 'published')` })
    .from(businesses)
    .leftJoin(locations, eq(locations.id, businesses.cityId))
    .where(where)
    .orderBy(desc(businesses.isFeatured), desc(sql`(SELECT count(*) FROM listings l WHERE l.business_id = ${businesses.id} AND l.status = 'published')`), desc(businesses.verificationLevel), asc(businesses.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const ids = rows.map((r) => r.b.id);
  const comms = ids.length
    ? await db
        .select({ businessId: businessCommodities.businessId, c: commodities })
        .from(businessCommodities)
        .innerJoin(commodities, eq(commodities.id, businessCommodities.commodityId))
        .where(inArray(businessCommodities.businessId, ids))
    : [];
  const items: SupplierCardData[] = rows.map((r) => ({
    id: r.b.id,
    slug: r.b.slug,
    name: r.b.name,
    businessType: r.b.businessType,
    cityName: r.city ? name(locale, r.city) : null,
    verificationLevel: r.b.verificationLevel,
    logoPath: r.b.logoPath,
    listingCount: Number(r.listingCount),
    commodities: comms.filter((c) => c.businessId === r.b.id).slice(0, 5).map((c) => name(locale, c.c)),
  }));
  const totalNum = Number(total);
  return { items, total: totalNum, page, pageSize, totalPages: Math.max(1, Math.ceil(totalNum / pageSize)) };
}

export type SupplierProfile = {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  businessType: string;
  description: string | null;
  contactPersonName: string | null;
  cityName: string | null;
  citySlug: string | null;
  provinceName: string | null;
  marketName: string | null;
  /** Only when the business consented to show its address. */
  addressLine: string | null;
  website: string | null;
  yearsInBusiness: number | null;
  languages: string[];
  logoPath: string | null;
  verificationLevel: string;
  status: string;
  phoneAvailable: boolean;
  whatsappAvailable: boolean;
  listingCount: number;
  createdAt: Date;
  commodities: Array<{ id: string; slug: string; name: string }>;
};

export async function getSupplierBySlug(slug: string, locale: Locale): Promise<SupplierProfile | null> {
  const [b] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!b) return null;
  const chain = await resolveLocationChain(b.marketId ?? b.cityId ?? b.provinceId);
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(listings).where(and(eq(listings.businessId, b.id), eq(listings.status, "published")));
  const comms = await db
    .select({ c: commodities })
    .from(businessCommodities)
    .innerJoin(commodities, eq(commodities.id, businessCommodities.commodityId))
    .where(and(eq(businessCommodities.businessId, b.id), eq(commodities.status, "active")))
    .orderBy(asc(commodities.nameEn));
  // Also include commodities with published listings but not declared.
  const listed = await db
    .selectDistinct({ c: commodities })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .where(and(eq(listings.businessId, b.id), eq(listings.status, "published")));
  const seen = new Set<string>();
  const all = [...comms, ...listed].filter((x) => (seen.has(x.c.id) ? false : (seen.add(x.c.id), true)));
  return {
    id: b.id,
    ownerId: b.ownerId,
    slug: b.slug,
    name: b.name,
    businessType: b.businessType,
    description: b.description,
    contactPersonName: b.contactPersonName,
    cityName: chain.city ? name(locale, chain.city) : null,
    citySlug: chain.city?.slug ?? null,
    provinceName: chain.province ? name(locale, chain.province) : null,
    marketName: chain.market ? name(locale, chain.market) : null,
    addressLine: b.showAddressPublicly ? b.addressLine : null,
    website: b.website,
    yearsInBusiness: b.yearsInBusiness,
    languages: b.languages,
    logoPath: b.logoPath,
    verificationLevel: b.verificationLevel,
    status: b.status,
    phoneAvailable: Boolean(b.publicPhone && b.showPhonePublicly),
    whatsappAvailable: Boolean(b.whatsappNumber && b.showWhatsappPublicly),
    listingCount: Number(n),
    createdAt: b.createdAt,
    commodities: all.map((x) => ({ id: x.c.id, slug: x.c.slug, name: name(locale, x.c) })),
  };
}

export async function getSupplierCountByCity(): Promise<Map<string, number>> {
  const rows = await db
    .select({ cityId: businesses.cityId, n: sql<number>`count(*)` })
    .from(businesses)
    .where(and(eq(businesses.status, "active"), sql`${businesses.cityId} IS NOT NULL`))
    .groupBy(businesses.cityId);
  return new Map(rows.filter((r) => r.cityId).map((r) => [r.cityId as string, Number(r.n)]));
}
