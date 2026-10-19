"use server";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businesses, listingReports, listings, supportCases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { hashIp } from "@/lib/auth/crypto";
import { makeReference } from "@/lib/utils/ids";
import { cleanUserText } from "@/lib/utils/text";
import type { ActionResult } from "@/lib/validation/common";

const schema = z.object({
  kind: z.enum(["listing", "business"]),
  id: z.string().uuid(),
  reason: z.enum(["spam", "misleading_price", "fraud", "prohibited_goods", "privacy", "duplicate", "wrong_category", "other"]),
  description: z.string().max(2000).optional().nullable(),
  contact: z.string().max(200).optional().nullable(),
  website: z.string().max(0).optional().nullable(), // honeypot
});

const reasonToCase: Record<string, (typeof supportCases.$inferInsert)["caseType"]> = {
  spam: "spam",
  misleading_price: "misleading_price",
  fraud: "fraud",
  prohibited_goods: "prohibited_goods",
  privacy: "privacy",
  duplicate: "listing_report",
  wrong_category: "listing_report",
  other: "listing_report",
};

export async function submitReportAction(input: z.input<typeof schema>): Promise<ActionResult<{ reference: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.website) return { ok: true, data: { reference: "ok" } }; // bot: pretend success
  const user = await getCurrentUser();
  const h = await headers();
  const c = await cookies();
  const key = user ? `report:user:${user.id}` : `report:anon:${c.get("ml_anon")?.value ?? hashIp(h.get("x-forwarded-for"))}`;
  try {
    await enforceRateLimit(key, 10, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }
  const { kind, id, reason } = parsed.data;
  const description = cleanUserText(parsed.data.description, 2000);
  let listingId: string | null = null;
  let businessId: string | null = null;
  let subject = "";
  if (kind === "listing") {
    const [l] = await db.select({ id: listings.id, title: listings.title, businessId: listings.businessId }).from(listings).where(eq(listings.id, id)).limit(1);
    if (!l) return { ok: false, error: "not_found" };
    listingId = l.id;
    businessId = l.businessId;
    subject = `Listing report: ${l.title}`;
  } else {
    const [b] = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!b) return { ok: false, error: "not_found" };
    businessId = b.id;
    subject = `Supplier report: ${b.name}`;
  }
  const reference = makeReference("CASE");
  await db.transaction(async (tx) => {
    await tx.insert(listingReports).values({ reporterId: user?.id ?? null, listingId, businessId: kind === "business" ? businessId : null, reason, description });
    await tx.insert(supportCases).values({
      reference,
      caseType: kind === "business" && reason === "other" ? "supplier_report" : reasonToCase[reason],
      severity: reason === "fraud" || reason === "prohibited_goods" ? "high" : "medium",
      reporterId: user?.id ?? null,
      reporterContact: user ? null : cleanUserText(parsed.data.contact, 200),
      subject,
      description: `${reason}${description ? `\n\n${description}` : ""}`,
      entityType: kind,
      entityId: id,
    });
  });
  return { ok: true, data: { reference } };
}
