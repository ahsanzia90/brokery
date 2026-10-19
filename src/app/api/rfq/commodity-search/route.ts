import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, commodityAliases } from "@/db/schema";
import { normalizeText } from "@/lib/utils/text";

export const dynamic = "force-dynamic";

/** Commodity search for the RFQ form: name, Urdu name and aliases, typo tolerant. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const norm = normalizeText(q);
  const like = `%${norm}%`;
  const base = db
    .select({ id: commodities.id, slug: commodities.slug, nameEn: commodities.nameEn, nameUr: commodities.nameUr, categoryName: categories.nameEn, categoryNameUr: categories.nameUr, isPopular: commodities.isPopular })
    .from(commodities)
    .innerJoin(categories, eq(categories.id, commodities.categoryId));
  if (!norm) {
    const rows = await base.where(and(eq(commodities.status, "active"), eq(commodities.isPopular, true))).orderBy(commodities.sortOrder).limit(20);
    return NextResponse.json({ items: rows });
  }
  const rows = await db
    .selectDistinctOn([commodities.id], {
      id: commodities.id,
      slug: commodities.slug,
      nameEn: commodities.nameEn,
      nameUr: commodities.nameUr,
      categoryName: categories.nameEn,
      categoryNameUr: categories.nameUr,
      isPopular: commodities.isPopular,
      score: sql<number>`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0), CASE WHEN lower(${commodities.nameEn}) LIKE ${like} OR ${commodityAliases.normalized} LIKE ${like} THEN 0.9 ELSE 0 END)`,
    })
    .from(commodities)
    .innerJoin(categories, eq(categories.id, commodities.categoryId))
    .leftJoin(commodityAliases, eq(commodityAliases.commodityId, commodities.id))
    .where(and(eq(commodities.status, "active"), or(ilike(commodities.nameEn, like), sql`${commodities.nameUr} ILIKE ${like}`, ilike(commodityAliases.normalized, like), sql`similarity(lower(${commodities.nameEn}), ${norm}) > 0.3`, sql`similarity(${commodityAliases.normalized}, ${norm}) > 0.3`)))
    .orderBy(commodities.id, desc(sql`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0))`))
    .limit(40);
  rows.sort((a, b) => b.score - a.score || Number(b.isPopular) - Number(a.isPopular));
  return NextResponse.json({ items: rows.slice(0, 20).map(({ score: _s, ...r }) => r) });
}
