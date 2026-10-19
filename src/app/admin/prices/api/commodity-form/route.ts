import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/authz/guards";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { commodityGrades } from "@/db/schema";
import { getCommodityById, getCommodityBySlug, getUnitsForCommodity, getVarieties } from "@/lib/data/taxonomy";

/** All active grades for a commodity (commodity-wide and variety-specific; the form filters by variety client-side). */
async function getAllGrades(commodityId: string) {
  return db.select().from(commodityGrades).where(and(eq(commodityGrades.commodityId, commodityId), eq(commodityGrades.status, "active"))).orderBy(asc(commodityGrades.sortOrder), asc(commodityGrades.nameEn));
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requirePermission("prices.edit");
  } catch (e) {
    return NextResponse.json({ error: (e as AuthError).code ?? "forbidden" }, { status: 403 });
  }
  const key = new URL(req.url).searchParams.get("commodity") ?? "";
  const commodity = /^[0-9a-f-]{36}$/.test(key) ? await getCommodityById(key) : await getCommodityBySlug(key);
  if (!commodity) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [varieties, grades, u] = await Promise.all([commodity.supportsVarieties ? getVarieties(commodity.id) : [], commodity.supportsGrades ? getAllGrades(commodity.id) : [], getUnitsForCommodity(commodity)]);
  return NextResponse.json({
    commodity: { id: commodity.id, slug: commodity.slug, nameEn: commodity.nameEn, nameUr: commodity.nameUr, supportsPriceBenchmark: commodity.supportsPriceBenchmark },
    varieties: varieties.map((v) => ({ id: v.id, slug: v.slug, nameEn: v.nameEn, nameUr: v.nameUr })),
    grades: grades.map((g) => ({ id: g.id, slug: g.slug, nameEn: g.nameEn, nameUr: g.nameUr, varietyId: g.varietyId })),
    units: u.units.map((x) => ({ id: x.id, code: x.code, symbol: x.symbol, nameEn: x.nameEn })),
    defaultUnitId: u.defaultUnitId,
  });
}
