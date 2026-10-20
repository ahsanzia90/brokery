import { NextResponse } from "next/server";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { listingStatusHistory, listings, rfqs, supplierQuotes } from "@/db/schema";
import { deliverPendingNotifications } from "@/lib/notifications";
import { pruneRateLimits } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/config/settings";

export const dynamic = "force-dynamic";

/**
 * Maintenance endpoint. Call it every 10–15 minutes from your scheduler
 * (Vercel Cron, GitHub Actions, cron + curl) with header `Authorization: Bearer $CRON_SECRET`.
 * Each task is idempotent and reports what it did.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const report: Record<string, unknown> = {};

  // 1. Expire listings past expiresAt.
  const expired = await db
    .update(listings)
    .set({ status: "expired", statusReason: "Listing period ended" })
    .where(and(eq(listings.status, "published"), lt(listings.expiresAt, new Date())))
    .returning({ id: listings.id });
  if (expired.length) {
    await db.insert(listingStatusHistory).values(expired.map((e) => ({ listingId: e.id, previousStatus: "published" as const, newStatus: "expired" as const, reason: "auto-expired" })));
  }
  report.listingsExpired = expired.length;

  // 2. Expire RFQs and quotes.
  const rfqExpired = await db
    .update(rfqs)
    .set({ status: "closed", closedReason: "expired" })
    .where(and(inArray(rfqs.status, ["submitted", "matching", "responses_received"]), lt(rfqs.expiresAt, new Date())))
    .returning({ id: rfqs.id });
  report.rfqsClosed = rfqExpired.length;
  const quotesExpired = await db
    .update(supplierQuotes)
    .set({ status: "expired" })
    .where(and(inArray(supplierQuotes.status, ["sent", "viewed"]), sql`${supplierQuotes.validUntil} < current_date`))
    .returning({ id: supplierQuotes.id });
  report.quotesExpired = quotesExpired.length;

  // 3. Prices: hard-expire very old published rates (module exports its own logic).
  try {
    const mod = await import("@/lib/prices/expire");
    const staleDays = await getSetting<number>("prices.stale_after_days", 7);
    const hardDays = await getSetting<number>("prices.hard_expire_days", 30);
    report.prices = await mod.expireStalePrices({ staleDays, hardExpireDays: hardDays });
  } catch (e) {
    report.prices = { skipped: (e as Error).message };
  }

  // 4. Scheduled content.
  try {
    const mod = await import("@/lib/admin/content-service");
    report.contentPublished = await mod.publishScheduledContent();
  } catch (e) {
    report.contentPublished = { skipped: (e as Error).message };
  }

  // 5. Verification documents past their retention date.
  try {
    const mod = await import("@/lib/admin/verifications-service");
    report.documentsPurged = await mod.purgeExpiredDocuments();
  } catch (e) {
    report.documentsPurged = { skipped: (e as Error).message };
  }

  // 6. Outbound notifications and housekeeping.
  report.notifications = await deliverPendingNotifications(100);
  await pruneRateLimits();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...report });
}

/** Vercel Cron and similar schedulers call GET; same authorization applies. */
export async function GET(req: Request) {
  return POST(req);
}
