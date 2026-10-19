import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { cached } from "@/lib/cache";
import { db } from "@/db";
import { locations } from "@/db/schema";

export type LocationRow = typeof locations.$inferSelect;

export const getAllLocations = cached(
  async (): Promise<LocationRow[]> => db.select().from(locations).where(eq(locations.status, "active")).orderBy(asc(locations.sortOrder), asc(locations.nameEn)),
  ["locations"],
  { tags: ["locations"], revalidate: 600 },
);

export async function getProvinces() {
  return (await getAllLocations()).filter((l) => l.type === "province");
}

export async function getCities(provinceId?: string | null) {
  const all = await getAllLocations();
  const byId = new Map(all.map((l) => [l.id, l]));
  return all.filter((l) => {
    if (l.type !== "city") return false;
    if (!provinceId) return true;
    // city → district → province
    const district = l.parentId ? byId.get(l.parentId) : null;
    const prov = district?.type === "province" ? district : district?.parentId ? byId.get(district.parentId) : null;
    return prov?.id === provinceId || district?.id === provinceId;
  });
}

export async function getMajorCities() {
  return (await getAllLocations()).filter((l) => l.type === "city" && l.isMajorMarket);
}

export async function getMarkets(cityId: string) {
  return (await getAllLocations()).filter((l) => l.type === "market" && l.parentId === cityId);
}

export async function getLocationById(id: string): Promise<LocationRow | null> {
  return (await getAllLocations()).find((l) => l.id === id) ?? null;
}

export async function getLocationBySlug(type: LocationRow["type"], slug: string): Promise<LocationRow | null> {
  const [row] = await db.select().from(locations).where(and(eq(locations.type, type), eq(locations.slug, slug))).limit(1);
  return row ?? null;
}

export async function getLocationByPath(path: string): Promise<LocationRow | null> {
  const [row] = await db.select().from(locations).where(eq(locations.path, path)).limit(1);
  return row ?? null;
}

/** Resolve province/district/city for any location id. */
export async function resolveLocationChain(id: string | null | undefined): Promise<{ province: LocationRow | null; district: LocationRow | null; city: LocationRow | null; market: LocationRow | null }> {
  const out = { province: null as LocationRow | null, district: null as LocationRow | null, city: null as LocationRow | null, market: null as LocationRow | null };
  if (!id) return out;
  const all = await getAllLocations();
  const byId = new Map(all.map((l) => [l.id, l]));
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 6) {
    if (cur.type === "province") out.province = cur;
    if (cur.type === "district") out.district = cur;
    if (cur.type === "city") out.city = cur;
    if (cur.type === "market") out.market = cur;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

export async function searchLocations(q: string, types: LocationRow["type"][] = ["city", "market"], limit = 10): Promise<LocationRow[]> {
  const term = `%${q.trim()}%`;
  return db
    .select()
    .from(locations)
    .where(and(eq(locations.status, "active"), inArray(locations.type, types), or(ilike(locations.nameEn, term), sql`${locations.nameUr} ILIKE ${term}`, sql`EXISTS (SELECT 1 FROM unnest(${locations.aliasesRoman}) a WHERE a ILIKE ${term})`)))
    .orderBy(sql`${locations.isMajorMarket} DESC`, asc(locations.nameEn))
    .limit(limit);
}
