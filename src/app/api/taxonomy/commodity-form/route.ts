import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { commodities } from "@/db/schema";
import { getAttributesForCommodity, getGrades, getModerationLevel, getUnitsForCommodity, getVarieties } from "@/lib/data/taxonomy";
import { getSetting } from "@/lib/config/settings";

export const dynamic = "force-dynamic";

/** GET ?commodity=<id|slug> → everything the listing/RFQ forms need for a commodity. */
export async function GET(req: Request) {
  const key = (new URL(req.url).searchParams.get("commodity") ?? "").trim();
  if (!key) return NextResponse.json({ error: "commodity_required" }, { status: 400 });
  const isUuid = /^[0-9a-f-]{36}$/.test(key);
  const [commodity] = await db.select().from(commodities).where(isUuid ? eq(commodities.id, key) : eq(commodities.slug, key)).limit(1);
  if (!commodity || commodity.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [varieties, grades, unitsRes, attributes, moderationLevel, maundKg, maxImages] = await Promise.all([
    commodity.supportsVarieties ? getVarieties(commodity.id) : Promise.resolve([]),
    commodity.supportsGrades ? db.query.commodityGrades.findMany({ where: (g, { and, eq }) => and(eq(g.commodityId, commodity.id), eq(g.status, "active")), orderBy: (g, { asc }) => [asc(g.sortOrder), asc(g.nameEn)] }) : Promise.resolve([]),
    getUnitsForCommodity(commodity),
    getAttributesForCommodity(commodity),
    getModerationLevel(commodity),
    getSetting<number>("units.maund_kg", 40),
    getSetting<number>("listings.max_images", 6),
  ]);
  void getGrades;
  return NextResponse.json(
    {
      commodity: { id: commodity.id, slug: commodity.slug, nameEn: commodity.nameEn, nameUr: commodity.nameUr, supportsVarieties: commodity.supportsVarieties, supportsGrades: commodity.supportsGrades },
      varieties: varieties.map((v) => ({ id: v.id, slug: v.slug, nameEn: v.nameEn, nameUr: v.nameUr })),
      grades: grades.map((g) => ({ id: g.id, slug: g.slug, varietyId: g.varietyId, nameEn: g.nameEn, nameUr: g.nameUr, description: g.description })),
      units: unitsRes.units.map((u) => ({ id: u.id, code: u.code, symbol: u.symbol, nameEn: u.nameEn, nameUr: u.nameUr, unitType: u.unitType, baseFactor: u.baseFactor, conversionNote: u.conversionNote })),
      defaultUnitId: unitsRes.defaultUnitId,
      attributes: attributes.map((a) => ({ id: a.id, key: a.key, nameEn: a.nameEn, nameUr: a.nameUr, type: a.type, unitLabel: a.unitLabel, allowedValues: a.allowedValues, minValue: a.minValue, maxValue: a.maxValue, isRequired: a.isRequired, helpText: a.helpText })),
      moderationLevel,
      maundKg: Number(maundKg),
      maxImages: Number(maxImages),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
