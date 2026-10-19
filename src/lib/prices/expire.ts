import "server-only";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { marketPrices } from "@/db/schema";
import { getSetting } from "@/lib/config/settings";
import { recordHistory } from "./service";

/**
 * Marks published prices as expired when they are older than `hardExpireDays`
 * (observation date) or their `validUntil` has passed. Rows between `staleDays`
 * and `hardExpireDays` stay published but are labelled "older rate" in the UI.
 *
 * Intended to be called from a scheduled job (e.g. /api/cron/maintenance).
 * Returns the number of rows expired.
 */
export async function expireStalePrices(opts?: { staleDays?: number; hardExpireDays?: number; actorId?: string | null }): Promise<{ expired: number; staleDays: number; hardExpireDays: number }> {
  const staleDays = opts?.staleDays ?? (await getSetting<number>("prices.stale_after_days", 7));
  const hardExpireDays = opts?.hardExpireDays ?? (await getSetting<number>("prices.hard_expire_days", 30));
  const actorId = opts?.actorId ?? null;
  const expired = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(marketPrices)
      .where(
        and(
          eq(marketPrices.status, "published"),
          or(lt(marketPrices.observationDate, sql`(current_date - ${hardExpireDays}::int)::date`), sql`${marketPrices.validUntil} IS NOT NULL AND ${marketPrices.validUntil} <= now()`),
        ),
      )
      .for("update");
    for (const row of rows) {
      const [after] = await tx
        .update(marketPrices)
        .set({ status: "expired", validUntil: row.validUntil && row.validUntil.getTime() <= Date.now() ? row.validUntil : new Date() })
        .where(eq(marketPrices.id, row.id))
        .returning();
      await recordHistory(tx, after, "expired", actorId, ["status", "validUntil"], `Automatic expiry (older than ${hardExpireDays} days or past valid_until)`);
    }
    return rows.length;
  });
  return { expired, staleDays, hardExpireDays };
}
