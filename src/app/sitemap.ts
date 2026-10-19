import type { MetadataRoute } from "next";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, commodities, commodityVarieties, contentPages, listings, locations, marketPrices, seoMetadata } from "@/db/schema";
import { BRAND_DEFAULTS } from "@/lib/config/brand";

export const revalidate = 3600;

/**
 * Canonical, indexable pages only. Variety, commodity+city and city-directory pages
 * are included only when they have real inventory or price data. Admin overrides
 * (includeInSitemap=false or a noindex robots directive) are respected.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND_DEFAULTS.siteUrl;
  const url = (p: string) => `${base}${p}`;
  const excluded = new Set<string>();
  const excludedEntities = new Set<string>();
  const overrides = await db.select().from(seoMetadata).where(sql`${seoMetadata.includeInSitemap} = false OR ${seoMetadata.robots} ILIKE '%noindex%'`);
  for (const o of overrides) {
    if (o.path) excluded.add(o.path);
    if (o.entityType && o.entityId) excludedEntities.add(`${o.entityType}:${o.entityId}`);
  }
  const ok = (path: string, entity?: string) => !excluded.has(path) && !(entity && excludedEntities.has(entity));

  const out: MetadataRoute.Sitemap = [];
  const add = (path: string, lastModified?: Date | null, priority = 0.5, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly", entity?: string) => {
    if (ok(path, entity)) out.push({ url: url(path), lastModified: lastModified ?? undefined, priority, changeFrequency });
  };

  add("/", null, 1, "daily");
  add("/categories", null, 0.8);
  add("/listings", null, 0.8, "daily");
  add("/suppliers", null, 0.8, "daily");
  add("/prices", null, 0.8, "daily");
  add("/markets", null, 0.6);
  add("/guides", null, 0.6);
  add("/buy", null, 0.6);
  add("/contact", null, 0.3, "monthly");

  const cats = await db.select().from(categories).where(eq(categories.status, "active"));
  for (const c of cats) add(`/categories/${c.slug}`, c.updatedAt, 0.7, "weekly", `category:${c.id}`);

  const comms = await db.select().from(commodities).where(eq(commodities.status, "active"));
  const commBySlug = new Map(comms.map((c) => [c.id, c.slug]));
  for (const c of comms) add(`/commodities/${c.slug}`, c.updatedAt, 0.7, "weekly", `commodity:${c.id}`);

  // Varieties with ≥1 published listing or ≥1 published price.
  const varieties = await db
    .select({ v: commodityVarieties })
    .from(commodityVarieties)
    .where(and(eq(commodityVarieties.status, "active"), sql`(EXISTS (SELECT 1 FROM listings l WHERE l.variety_id = ${commodityVarieties.id} AND l.status = 'published') OR EXISTS (SELECT 1 FROM market_prices p WHERE p.variety_id = ${commodityVarieties.id} AND p.status = 'published'))`));
  for (const { v } of varieties) {
    const cs = commBySlug.get(v.commodityId);
    if (cs) add(`/commodities/${cs}/${v.slug}`, v.updatedAt, 0.6, "weekly", `variety:${v.id}`);
  }

  // Commodity + city pairs with listings or prices.
  const pairs = await db.execute<{ commodity_id: string; city_slug: string }>(sql`
    SELECT DISTINCT x.commodity_id, loc.slug AS city_slug FROM (
      SELECT l.commodity_id, l.city_id AS loc_id FROM listings l WHERE l.status = 'published' AND l.city_id IS NOT NULL
      UNION
      SELECT p.commodity_id, COALESCE((SELECT parent.id FROM locations parent WHERE parent.id = lo.parent_id AND parent.type = 'city'), lo.id) FROM market_prices p JOIN locations lo ON lo.id = p.location_id WHERE p.status = 'published'
    ) x JOIN locations loc ON loc.id = x.loc_id AND loc.type = 'city' AND loc.status = 'active'`);
  for (const r of pairs.rows) {
    const cs = commBySlug.get(r.commodity_id);
    if (cs) add(`/commodities/${cs}/city/${r.city_slug}`, null, 0.5, "weekly");
  }

  const pubListings = await db.select({ slug: listings.slug, updatedAt: listings.updatedAt }).from(listings).innerJoin(businesses, eq(businesses.id, listings.businessId)).where(and(eq(listings.status, "published"), eq(businesses.status, "active")));
  for (const l of pubListings) add(`/listings/${l.slug}`, l.updatedAt, 0.6, "weekly");

  const citiesWithSuppliers = await db
    .select({ slug: locations.slug, id: locations.id })
    .from(locations)
    .where(and(eq(locations.type, "city"), eq(locations.status, "active"), sql`EXISTS (SELECT 1 FROM businesses b WHERE b.city_id = ${locations.id} AND b.status = 'active')`));
  for (const c of citiesWithSuppliers) add(`/suppliers/${c.slug}`, null, 0.6, "weekly", `location:${c.id}`);

  const sups = await db.select({ slug: businesses.slug, updatedAt: businesses.updatedAt, id: businesses.id }).from(businesses).where(eq(businesses.status, "active"));
  for (const s of sups) add(`/supplier/${s.slug}`, s.updatedAt, 0.6, "weekly", `business:${s.id}`);

  const pricedCommodities = await db.selectDistinct({ id: marketPrices.commodityId }).from(marketPrices).where(eq(marketPrices.status, "published"));
  for (const p of pricedCommodities) {
    const cs = commBySlug.get(p.id);
    if (cs) add(`/prices/${cs}`, null, 0.7, "daily");
  }

  const locs = await db
    .select({ path: locations.path, id: locations.id, updatedAt: locations.updatedAt })
    .from(locations)
    .where(and(eq(locations.status, "active"), sql`${locations.type} IN ('province','city','market')`, sql`(EXISTS (SELECT 1 FROM businesses b WHERE (b.city_id = ${locations.id} OR b.province_id = ${locations.id} OR b.market_id = ${locations.id}) AND b.status = 'active') OR EXISTS (SELECT 1 FROM listings l WHERE (l.city_id = ${locations.id} OR l.province_id = ${locations.id} OR l.market_id = ${locations.id}) AND l.status = 'published') OR EXISTS (SELECT 1 FROM market_prices p WHERE p.location_id = ${locations.id} AND p.status = 'published'))`));
  for (const l of locs) add(`/markets/${l.path}`, l.updatedAt, 0.5, "weekly", `location:${l.id}`);

  const content = await db.select({ slug: contentPages.slug, kind: contentPages.kind, updatedAt: contentPages.updatedAt, id: contentPages.id }).from(contentPages).where(and(eq(contentPages.status, "published"), isNotNull(contentPages.publishedAt)));
  for (const c of content) {
    if (c.kind === "page") add(c.slug === "contact" ? "/contact" : `/${c.slug}`, c.updatedAt, 0.4, "monthly", `content:${c.id}`);
    else if (c.kind === "guide" || c.kind === "article") add(`/guides/${c.slug}`, c.updatedAt, 0.6, "monthly", `content:${c.id}`);
  }

  // De-duplicate (contact appears via content pages and static list).
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
