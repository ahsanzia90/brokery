import "server-only";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { sql } from "drizzle-orm";

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("rate_limited");
  }
}

/**
 * Fixed-window counter stored in PostgreSQL so it works across instances.
 * Throws RateLimitError when `limit` is exceeded within `windowSeconds`.
 */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });
  const row = rows[0];
  if (row && row.count > limit) {
    const elapsed = (Date.now() - new Date(row.windowStart).getTime()) / 1000;
    throw new RateLimitError(Math.max(1, Math.ceil(windowSeconds - elapsed)));
  }
}

/** Opportunistic cleanup; call from a cron/maintenance route. */
export async function pruneRateLimits(): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
}
