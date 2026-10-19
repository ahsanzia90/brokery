import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, commodities, favoriteBusinesses, favoriteCommodities, favoriteListings, listings, locations } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { ListingCardData, SupplierCardData } from "@/components/marketplace/cards";
import { getListingBySlug } from "@/lib/data/listings";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

export async function isFavorited(userId: string | null | undefined, kind: "listing" | "business" | "commodity", id: string): Promise<boolean> {
  if (!userId) return false;
  if (kind === "listing") {
    const [r] = await db.select({ x: sql`1` }).from(favoriteListings).where(and(eq(favoriteListings.userId, userId), eq(favoriteListings.listingId, id))).limit(1);
    return Boolean(r);
  }
  if (kind === "business") {
    const [r] = await db.select({ x: sql`1` }).from(favoriteBusinesses).where(and(eq(favoriteBusinesses.userId, userId), eq(favoriteBusinesses.businessId, id))).limit(1);
    return Boolean(r);
  }
  const [r] = await db.select({ x: sql`1` }).from(favoriteCommodities).where(and(eq(favoriteCommodities.userId, userId), eq(favoriteCommodities.commodityId, id))).limit(1);
  return Boolean(r);
}

export async function getFavorites(userId: string, locale: Locale): Promise<{ listings: ListingCardData[]; suppliers: SupplierCardData[]; commodities: Array<{ id: string; slug: string; name: string }> }> {
  const favL = await db.select({ id: favoriteListings.listingId }).from(favoriteListings).where(eq(favoriteListings.userId, userId)).orderBy(desc(favoriteListings.createdAt)).limit(100);
  let listingCards: ListingCardData[] = [];
  if (favL.length) {
    // Only published listings are shown; preserve the order the user saved them in.
    const ids = favL.map((f) => f.id);
    const rows = await db.select({ slug: listings.slug, id: listings.id }).from(listings).where(and(inArray(listings.id, ids), eq(listings.status, "published")));
    const all = await Promise.all(rows.map((r) => getListingBySlug(r.slug, locale)));
    listingCards = all
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        id: d.listing.id,
        slug: d.listing.slug,
        title: d.listing.title,
        commodityName: name(locale, d.commodity),
        varietyName: d.variety ? name(locale, d.variety) : d.listing.customVariety,
        priceType: d.listing.priceType,
        priceAmount: d.listing.priceAmount,
        priceUnitSymbol: d.priceUnit?.symbol ?? null,
        quantity: d.listing.quantity,
        unitSymbol: d.unit.symbol,
        cityName: d.location.city,
        imagePath: d.images[0]?.storagePath ?? null,
        businessName: d.business.name,
        businessSlug: d.business.slug,
        verificationLevel: d.business.verificationLevel,
        publishedAt: d.listing.publishedAt,
      }))
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }
  const favB = await db
    .select({ b: businesses, city: locations, listingCount: sql<number>`(SELECT count(*) FROM listings l WHERE l.business_id = ${businesses.id} AND l.status = 'published')` })
    .from(favoriteBusinesses)
    .innerJoin(businesses, eq(businesses.id, favoriteBusinesses.businessId))
    .leftJoin(locations, eq(locations.id, businesses.cityId))
    .where(and(eq(favoriteBusinesses.userId, userId), eq(businesses.status, "active")))
    .orderBy(desc(favoriteBusinesses.createdAt))
    .limit(100);
  const suppliers: SupplierCardData[] = favB.map((r) => ({
    id: r.b.id,
    slug: r.b.slug,
    name: r.b.name,
    businessType: r.b.businessType,
    cityName: r.city ? name(locale, r.city) : null,
    verificationLevel: r.b.verificationLevel,
    logoPath: r.b.logoPath,
    listingCount: Number(r.listingCount),
    commodities: [],
  }));
  const favC = await db
    .select({ c: commodities })
    .from(favoriteCommodities)
    .innerJoin(commodities, eq(commodities.id, favoriteCommodities.commodityId))
    .where(eq(favoriteCommodities.userId, userId))
    .orderBy(desc(favoriteCommodities.createdAt))
    .limit(100);
  return { listings: listingCards, suppliers, commodities: favC.map((r) => ({ id: r.c.id, slug: r.c.slug, name: name(locale, r.c) })) };
}
