import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, commodityAliases } from "@/db/schema";
import { AuthError, requirePermission } from "@/lib/authz/guards";
import { normalizeText } from "@/lib/utils/text";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requirePermission("prices.edit");
  } catch (e) {
    return NextResponse.json({ error: (e as AuthError).code ?? "forbidden" }, { status: 403 });
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const norm = normalizeText(q);
  const like = `%${norm}%`;
  const rows = await db
    .selectDistinctOn([commodities.id], {
      id: commodities.id,
      slug: commodities.slug,
      nameEn: commodities.nameEn,
      nameUr: commodities.nameUr,
      categoryName: categories.nameEn,
      score: sql<number>`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0))`,
    })
    .from(commodities)
    .innerJoin(categories, eq(categories.id, commodities.categoryId))
    .leftJoin(commodityAliases, eq(commodityAliases.commodityId, commodities.id))
    .where(and(eq(commodities.status, "active"), norm ? or(ilike(commodities.nameEn, like), ilike(commodityAliases.normalized, like), sql`similarity(lower(${commodities.nameEn}), ${norm}) > 0.3`) : undefined))
    .orderBy(commodities.id, desc(sql`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0))`))
    .limit(60);
  rows.sort((a, b) => b.score - a.score || a.nameEn.localeCompare(b.nameEn));
  return NextResponse.json({ items: rows.slice(0, 20).map(({ score: _s, ...r }) => r) });
}
