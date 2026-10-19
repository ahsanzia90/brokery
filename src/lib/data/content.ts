import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

export type ContentRow = typeof contentPages.$inferSelect;

export async function getPageBySlug(slug: string, kinds: Array<ContentRow["kind"]> = ["page"]): Promise<ContentRow | null> {
  const [row] = await db
    .select()
    .from(contentPages)
    .where(and(eq(contentPages.slug, slug), sql`${contentPages.kind} IN ${kinds}`, eq(contentPages.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function getGuides(page = 1, pageSize = 12) {
  const where = and(sql`${contentPages.kind} IN ('guide','article')`, eq(contentPages.status, "published"));
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(contentPages).where(where);
  const items = await db
    .select()
    .from(contentPages)
    .where(where)
    .orderBy(desc(contentPages.publishedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const totalNum = Number(total);
  return { items, total: totalNum, page, pageSize, totalPages: Math.max(1, Math.ceil(totalNum / pageSize)) };
}

export async function getGuideBySlug(slug: string): Promise<ContentRow | null> {
  return getPageBySlug(slug, ["guide", "article"]);
}

export async function getGuidesForCommodity(commodityId: string, limit = 4): Promise<ContentRow[]> {
  return db
    .select()
    .from(contentPages)
    .where(and(sql`${contentPages.kind} IN ('guide','article')`, eq(contentPages.status, "published"), sql`${commodityId}::uuid = ANY(${contentPages.relatedCommodityIds})`))
    .orderBy(desc(contentPages.publishedAt))
    .limit(limit);
}

export async function getPublishedPages(): Promise<ContentRow[]> {
  return db.select().from(contentPages).where(and(eq(contentPages.kind, "page"), eq(contentPages.status, "published")));
}
