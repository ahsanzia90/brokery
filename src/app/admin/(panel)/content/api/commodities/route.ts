import { NextResponse } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz/permissions";

export const dynamic = "force-dynamic";

/** Admin-only commodity search used by content editors (related commodities picker). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.roles)) return NextResponse.json({ items: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const like = `%${q}%`;
  const rows = await db
    .select({ id: commodities.id, slug: commodities.slug, nameEn: commodities.nameEn, nameUr: commodities.nameUr, categoryName: categories.nameEn })
    .from(commodities)
    .innerJoin(categories, eq(categories.id, commodities.categoryId))
    .where(and(eq(commodities.status, "active"), q ? or(ilike(commodities.nameEn, like), sql`${commodities.nameUr} ILIKE ${like}`, ilike(commodities.slug, like)) : undefined))
    .orderBy(commodities.nameEn)
    .limit(20);
  return NextResponse.json({ items: rows });
}
