"use server";
import { cookies, headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, enquiryEvents, listings, rfqs, supplierQuotes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/config/settings";
import { track } from "@/lib/analytics/track";
import { hashIp } from "@/lib/auth/crypto";
import { formatPhoneDisplay, whatsappLink } from "@/lib/utils/phone";
import type { ActionResult } from "@/lib/validation/common";

export type RevealInput = {
  businessId: string;
  channel: "phone" | "whatsapp";
  listingId?: string | null;
  rfqId?: string | null;
  quoteId?: string | null;
};

export type RevealResult = { phoneE164: string; display: string; href: string };

/**
 * Reveals a supplier's contact number subject to the supplier's consent flags.
 * Rate limited per user / anonymous visitor. Records contact clicks for stats.
 */
export async function revealContactAction(input: RevealInput): Promise<ActionResult<RevealResult>> {
  const user = await getCurrentUser();
  const requireLogin = await getSetting<boolean>("contact.require_login", false);
  if (requireLogin && !user) return { ok: false, error: "login_required" };

  const h = await headers();
  const c = await cookies();
  const limiterKey = user ? `contact:user:${user.id}` : `contact:anon:${c.get("ml_anon")?.value ?? hashIp(h.get("x-forwarded-for"))}`;
  const perHour = await getSetting<number>("rate_limits.contact_clicks_per_hour", 60);
  try {
    await enforceRateLimit(limiterKey, perHour, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }

  const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, input.businessId), eq(businesses.status, "active"))).limit(1);
  if (!biz) return { ok: false, error: "not_found" };

  let listingRow: typeof listings.$inferSelect | null = null;
  if (input.listingId) {
    const [l] = await db.select().from(listings).where(and(eq(listings.id, input.listingId), eq(listings.businessId, biz.id))).limit(1);
    listingRow = l ?? null;
  }

  // Quote context: a buyer contacting a supplier who responded to their RFQ may use the
  // number even if it is not public, because the supplier opted in by quoting.
  let viaQuote = false;
  if (input.rfqId && input.quoteId && user) {
    const [q] = await db
      .select({ id: supplierQuotes.id })
      .from(supplierQuotes)
      .innerJoin(rfqs, eq(rfqs.id, supplierQuotes.rfqId))
      .where(and(eq(supplierQuotes.id, input.quoteId), eq(supplierQuotes.rfqId, input.rfqId), eq(supplierQuotes.businessId, biz.id), eq(rfqs.buyerId, user.id)))
      .limit(1);
    viaQuote = Boolean(q);
  }

  let number: string | null = null;
  if (input.channel === "phone") {
    const consented = biz.showPhonePublicly && (listingRow ? listingRow.contactPhoneEnabled : true);
    if (biz.publicPhone && (consented || viaQuote)) number = biz.publicPhone;
  } else {
    const consented = biz.showWhatsappPublicly && (listingRow ? listingRow.contactWhatsappEnabled : true);
    if (biz.whatsappNumber && (consented || viaQuote)) number = biz.whatsappNumber;
  }
  if (!number) return { ok: false, error: "not_shared" };

  // Stats and audit trail (never block on failures).
  try {
    if (listingRow) await db.update(listings).set({ contactClickCount: sql`${listings.contactClickCount} + 1` }).where(eq(listings.id, listingRow.id));
    if (input.rfqId) {
      await db.insert(enquiryEvents).values({ rfqId: input.rfqId, quoteId: input.quoteId ?? null, actorId: user?.id ?? null, eventType: "contact_clicked", metadata: { channel: input.channel, businessId: biz.id } });
      if (input.quoteId) await db.update(supplierQuotes).set({ status: "contacted" }).where(and(eq(supplierQuotes.id, input.quoteId), sql`${supplierQuotes.status} IN ('sent','viewed')`));
    }
    await track("contact_click", { entityType: listingRow ? "listing" : "business", entityId: listingRow?.id ?? biz.id, properties: { channel: input.channel, businessId: biz.id } });
  } catch {}

  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink";
  const text = listingRow ? `Assalam o Alaikum, I saw your listing "${listingRow.title}" on ${brand}.` : `Assalam o Alaikum, I found your business on ${brand}.`;
  return {
    ok: true,
    data: {
      phoneE164: number,
      display: formatPhoneDisplay(number),
      href: input.channel === "phone" ? `tel:${number}` : whatsappLink(number, text),
    },
  };
}
