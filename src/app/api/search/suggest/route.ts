import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, commodities, commodityAliases, locations, searchLogs } from "@/db/schema";
import { normalizeText } from "@/lib/utils/text";
import { isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

type Suggestion = { type: "commodity" | "category" | "supplier" | "location" | "popular"; label: string; sub?: string; href: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 80);
  const lang = isLocale(searchParams.get("lang")) ? searchParams.get("lang") : "en";
  const norm = normalizeText(q);
  const suggestions: Suggestion[] = [];
  const name = (row: { nameEn: string; nameUr: string | null }) => (lang === "ur" && row.nameUr ? row.nameUr : row.nameEn);

  if (!norm) {
    // Popular searches based on actual usage over the last 30 days.
    const popular = await db
      .select({ normalized: searchLogs.normalized, q: sql<string>`min(${searchLogs.queryText})`, n: sql<number>`count(*)` })
      .from(searchLogs)
      .where(and(gte(searchLogs.createdAt, sql`now() - interval '30 days'`), sql`${searchLogs.resultCount} > 0`))
      .groupBy(searchLogs.normalized)
      .orderBy(desc(sql`count(*)`))
      .limit(6);
    for (const p of popular) suggestions.push({ type: "popular", label: p.q, href: `/search?q=${encodeURIComponent(p.q)}` });
    const popularCommodities = await db.select().from(commodities).where(and(eq(commodities.status, "active"), eq(commodities.isPopular, true))).orderBy(commodities.sortOrder).limit(6);
    for (const c of popularCommodities) suggestions.push({ type: "commodity", label: name(c), href: `/commodities/${c.slug}` });
    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  }

  const like = `%${norm}%`;
  const commodityRows = await db
    .selectDistinctOn([commodities.id], { c: commodities, score: sql<number>`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0))` })
    .from(commodities)
    .leftJoin(commodityAliases, eq(commodityAliases.commodityId, commodities.id))
    .where(
      and(
        eq(commodities.status, "active"),
        or(ilike(commodities.nameEn, like), sql`${commodities.nameUr} ILIKE ${like}`, ilike(commodityAliases.normalized, like), sql`similarity(lower(${commodities.nameEn}), ${norm}) > 0.3`, sql`similarity(${commodityAliases.normalized}, ${norm}) > 0.3`),
      ),
    )
    .orderBy(commodities.id, desc(sql`greatest(similarity(lower(${commodities.nameEn}), ${norm}), coalesce(similarity(${commodityAliases.normalized}, ${norm}), 0))`))
    .limit(12);
  // Exact alias/name hits first, then trigram similarity.
  const exactIds = new Set(
    (
      await db
        .select({ id: commodityAliases.commodityId })
        .from(commodityAliases)
        .where(eq(commodityAliases.normalized, norm))
    ).map((r) => r.id),
  );
  commodityRows
    .sort((a, b) => Number(exactIds.has(b.c.id) || normalizeText(b.c.nameEn) === norm) - Number(exactIds.has(a.c.id) || normalizeText(a.c.nameEn) === norm) || b.score - a.score)
    .slice(0, 6)
    .forEach((r) => suggestions.push({ type: "commodity", label: name(r.c), href: `/commodities/${r.c.slug}` }));

  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.status, "active"), or(ilike(categories.nameEn, like), sql`${categories.nameUr} ILIKE ${like}`, sql`EXISTS (SELECT 1 FROM unnest(${categories.aliasesRoman}) a WHERE lower(a) LIKE ${like})`)))
    .limit(3);
  for (const c of cats) suggestions.push({ type: "category", label: name(c), href: `/categories/${c.slug}` });

  const sup = await db
    .select({ name: businesses.name, slug: businesses.slug })
    .from(businesses)
    .where(and(eq(businesses.status, "active"), ilike(businesses.name, like)))
    .limit(3);
  for (const s of sup) suggestions.push({ type: "supplier", label: s.name, href: `/supplier/${s.slug}` });

  const locs = await db
    .select()
    .from(locations)
    .where(and(eq(locations.status, "active"), eq(locations.type, "city"), or(ilike(locations.nameEn, like), sql`${locations.nameUr} ILIKE ${like}`)))
    .orderBy(desc(locations.isMajorMarket))
    .limit(2);
  for (const l of locs) suggestions.push({ type: "location", label: name(l), href: `/suppliers/${l.slug}` });

  return NextResponse.json({ suggestions: suggestions.slice(0, 10) }, { headers: { "Cache-Control": "private, max-age=30" } });
}
