import { NextResponse } from "next/server";
import { getAttributesForCommodity, getCommodityById, getCommodityBySlug, getGrades, getUnitsForCommodity, getVarieties } from "@/lib/data/taxonomy";

export const dynamic = "force-dynamic";

/** Everything the RFQ form needs once a commodity is chosen: varieties, grades, units, attributes. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("commodity") ?? "";
  const commodity = /^[0-9a-f-]{36}$/i.test(key) ? await getCommodityById(key) : await getCommodityBySlug(key);
  if (!commodity || commodity.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [varieties, grades, unitInfo, attributes] = await Promise.all([
    commodity.supportsVarieties ? getVarieties(commodity.id) : [],
    commodity.supportsGrades ? getGrades(commodity.id) : [],
    getUnitsForCommodity(commodity),
    getAttributesForCommodity(commodity),
  ]);
  return NextResponse.json(
    {
      commodity: { id: commodity.id, slug: commodity.slug, nameEn: commodity.nameEn, nameUr: commodity.nameUr, supportsVarieties: commodity.supportsVarieties, supportsGrades: commodity.supportsGrades },
      varieties: varieties.map((v) => ({ id: v.id, slug: v.slug, nameEn: v.nameEn, nameUr: v.nameUr })),
      grades: grades.map((g) => ({ id: g.id, slug: g.slug, nameEn: g.nameEn, nameUr: g.nameUr, varietyId: g.varietyId })),
      units: unitInfo.units.map((u) => ({ id: u.id, code: u.code, nameEn: u.nameEn, nameUr: u.nameUr, symbol: u.symbol, unitType: u.unitType })),
      defaultUnitId: unitInfo.defaultUnitId,
      attributes: attributes.map((a) => ({ id: a.id, key: a.key, nameEn: a.nameEn, nameUr: a.nameUr, type: a.type, unitLabel: a.unitLabel, allowedValues: a.allowedValues, helpText: a.helpText })),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
