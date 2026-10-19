"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favoriteBusinesses, favoriteCommodities, favoriteListings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/validation/common";

const schema = z.object({ kind: z.enum(["listing", "business", "commodity"]), id: z.string().uuid(), next: z.string().optional() });

export async function toggleFavoriteAction(input: { kind: "listing" | "business" | "commodity"; id: string; next?: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) {
    const next = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const { kind, id } = parsed.data;
  if (kind === "listing") {
    const [existing] = await db.select().from(favoriteListings).where(and(eq(favoriteListings.userId, user.id), eq(favoriteListings.listingId, id))).limit(1);
    if (existing) {
      await db.delete(favoriteListings).where(and(eq(favoriteListings.userId, user.id), eq(favoriteListings.listingId, id)));
      return { ok: true, data: { saved: false } };
    }
    await db.insert(favoriteListings).values({ userId: user.id, listingId: id }).onConflictDoNothing();
    return { ok: true, data: { saved: true } };
  }
  if (kind === "business") {
    const [existing] = await db.select().from(favoriteBusinesses).where(and(eq(favoriteBusinesses.userId, user.id), eq(favoriteBusinesses.businessId, id))).limit(1);
    if (existing) {
      await db.delete(favoriteBusinesses).where(and(eq(favoriteBusinesses.userId, user.id), eq(favoriteBusinesses.businessId, id)));
      return { ok: true, data: { saved: false } };
    }
    await db.insert(favoriteBusinesses).values({ userId: user.id, businessId: id }).onConflictDoNothing();
    return { ok: true, data: { saved: true } };
  }
  const [existing] = await db.select().from(favoriteCommodities).where(and(eq(favoriteCommodities.userId, user.id), eq(favoriteCommodities.commodityId, id))).limit(1);
  if (existing) {
    await db.delete(favoriteCommodities).where(and(eq(favoriteCommodities.userId, user.id), eq(favoriteCommodities.commodityId, id)));
    return { ok: true, data: { saved: false } };
  }
  await db.insert(favoriteCommodities).values({ userId: user.id, commodityId: id }).onConflictDoNothing();
  return { ok: true, data: { saved: true } };
}
