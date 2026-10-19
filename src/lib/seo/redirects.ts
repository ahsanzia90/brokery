import "server-only";
import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";

/**
 * Call instead of notFound() on public pages: if an admin-managed redirect exists
 * for the current path (renamed category, merged commodity, moved listing), follow
 * it with the configured status code; otherwise render the 404 page.
 */
export async function redirectOr404(): Promise<never> {
  const h = await headers();
  const path = h.get("x-current-path");
  if (path && path.startsWith("/") && path.length < 512) {
    const normalized = path.replace(/\/+$/, "") || "/";
    const [r] = await db
      .select()
      .from(redirects)
      .where(and(eq(redirects.isActive, true), eq(redirects.sourcePath, normalized)))
      .limit(1);
    if (r && r.destinationPath !== normalized) {
      await db.update(redirects).set({ hitCount: sql`${redirects.hitCount} + 1` }).where(eq(redirects.id, r.id)).catch(() => {});
      if (r.statusCode === 301 || r.statusCode === 308) permanentRedirect(r.destinationPath);
      redirect(r.destinationPath);
    }
  }
  notFound();
}
