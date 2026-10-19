import { NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities } from "@/db/schema";
import { normalizeText } from "@/lib/utils/text";
import { getDescendantCategoryIds } from "@/lib/data/taxonomy";

export const dynamic = "force-dynamic";

/** GET ?q=<text>&category=<id>&ids=<id,id> → top 20 commodities (localized names + category name). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = normalizeText((sp.get("q") ?? "").slice(0, 80));
  const categoryId = sp.get("category");
  const ids = (sp.get("ids") ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/.test(s));
  const like = `%${q}%`;
  const conds = [eq(commodities.status, "active")];
  if (categoryId && /^[0-9a-f-]{36}$/.test(categoryId)) conds.push(inArray(commodities.categoryId, await getDescendantCategoryIds(categoryId)));
  if (ids.length) conds.push(inArray(commodities.id, ids));
  if (q) {
    conds.push(
      or(
        ilike(commodities.nameEn, like),
        sql`${commodities.nameUr} ILIKE ${like}`,
        sql`similarity(lower(${commodities.nameEn}), ${q}) > 0.3`,
        sql`EXISTS (SELECT 1 FROM commodity_aliases a WHERE a.commodity_id = ${commodities.id} AND (a.normalized ILIKE ${like} OR similarity(a.normalized, ${q}) > 0.35))`,
      )!,
    );
  }
  const rows = await db
    .select({ id: commodities.id, slug: commodities.slug, nameEn: commodities.nameEn, nameUr: commodities.nameUr, isPopular: commodities.isPopular, categoryName: categories.nameEn, categoryNameUr: categories.nameUr })
    .from(commodities)
    .innerJoin(categories, eq(categories.id, commodities.categoryId))
    .where(and(...conds))
    .orderBy(q ? desc(sql`greatest(similarity(lower(${commodities.nameEn}), ${q}), CASE WHEN ${commodities.nameEn} ILIKE ${like} THEN 0.9 ELSE 0 END)`) : desc(commodities.isPopular), asc(commodities.sortOrder), asc(commodities.nameEn))
    .limit(ids.length ? 100 : 20);
  return NextResponse.json({ items: rows }, { headers: { "Cache-Control": "private, max-age=30" } });
}
