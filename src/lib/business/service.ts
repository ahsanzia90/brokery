import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businessCommodities, businessDocuments, businessVerifications, businesses, profiles, userConsents, userRoles } from "@/db/schema";
import { phoneSchema, optionalText, type ActionResult } from "@/lib/validation/common";
import { randomSuffix, slugify } from "@/lib/utils/text";
import { normalizePakistanPhone } from "@/lib/utils/phone";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics/track";
import { attachOpenRfqsToBusiness } from "./quote-service";
import { getBusinessForUser, getOpenVerification, userCanManageBusiness } from "./queries";

export const BUSINESS_TYPES = ["trader", "wholesaler", "manufacturer", "farmer", "importer", "exporter", "distributor", "broker", "mill", "other"] as const;

const optionalPhone = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const n = normalizePakistanPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return z.NEVER;
    }
    return n;
  });

export const businessSchema = z.object({
  name: z.string().trim().min(2, "min").max(120, "max"),
  businessType: z.enum(BUSINESS_TYPES),
  description: optionalText(2000).optional(),
  contactPersonName: optionalText(100).optional(),
  addressLine: optionalText(300).optional(),
  provinceId: z.string().uuid().nullable().optional(),
  cityId: z.string().uuid().nullable().optional(),
  marketId: z.string().uuid().nullable().optional(),
  publicPhone: phoneSchema.nullable().optional(),
  whatsappNumber: optionalPhone,
  showPhonePublicly: z.boolean(),
  showWhatsappPublicly: z.boolean(),
  showAddressPublicly: z.boolean(),
  website: z
    .union([z.string().trim().max(200), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v ? (v.startsWith("http") ? v : `https://${v}`) : null)),
  yearsInBusiness: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= 0 && n <= 150), "invalid_number"),
  languages: z.array(z.string().trim().max(30)).max(6).default([]),
  commodityIds: z.array(z.string().uuid()).max(100).default([]),
  logoPath: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v && /^logos\/[a-z0-9/_.-]+$/i.test(v) ? v : null)),
  registrationNumber: optionalText(60).optional(),
});
export type BusinessInput = z.input<typeof businessSchema>;

export type Actor = { userId: string };

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name).slice(0, 60) || "business";
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${randomSuffix(4)}`;
    const [existing] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, candidate)).limit(1);
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}-${randomSuffix(8)}`;
}

/** Create the actor's business (if none) or update the one they manage. */
export async function upsertBusiness(actor: Actor, raw: BusinessInput): Promise<ActionResult<{ businessId: string; slug: string; created: boolean }>> {
  const parsed = businessSchema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0] ?? "_")] = i.message;
    return { ok: false, error: "validation", fieldErrors: fe };
  }
  const d = parsed.data;
  const [user] = await db.select().from(profiles).where(eq(profiles.id, actor.userId)).limit(1);
  if (!user || user.status !== "active") return { ok: false, error: "forbidden" };
  const existing = await getBusinessForUser(actor.userId);
  const publicPhone = d.publicPhone ?? user.phone;
  const verificationLevel = existing && existing.verificationLevel !== "none" ? existing.verificationLevel : user.phoneVerifiedAt ? "phone_verified" : "none";

  const result = await db.transaction(async (tx) => {
    let businessId: string;
    let slug: string;
    const base = {
      name: d.name,
      businessType: d.businessType,
      description: d.description,
      contactPersonName: d.contactPersonName,
      addressLine: d.addressLine,
      provinceId: d.provinceId,
      cityId: d.cityId,
      marketId: d.marketId,
      publicPhone,
      whatsappNumber: d.whatsappNumber,
      showPhonePublicly: d.showPhonePublicly,
      showWhatsappPublicly: d.showWhatsappPublicly && Boolean(d.whatsappNumber),
      showAddressPublicly: d.showAddressPublicly,
      website: d.website,
      yearsInBusiness: d.yearsInBusiness,
      languages: d.languages,
      registrationNumber: d.registrationNumber,
      ...(d.logoPath ? { logoPath: d.logoPath } : {}),
    };
    if (existing) {
      businessId = existing.id;
      slug = existing.slug;
      if (existing.name !== d.name) slug = await uniqueSlug(d.name, existing.id);
      await tx.update(businesses).set({ ...base, slug, verificationLevel }).where(eq(businesses.id, businessId));
      await audit({ actorId: actor.userId, action: "business.update", entityType: "business", entityId: businessId, before: { name: existing.name }, after: { name: d.name } }, tx);
    } else {
      slug = await uniqueSlug(d.name);
      const [created] = await tx.insert(businesses).values({ ...base, ownerId: actor.userId, slug, verificationLevel }).returning({ id: businesses.id });
      businessId = created.id;
      await tx.update(profiles).set({ isSeller: true }).where(eq(profiles.id, actor.userId));
      await tx.insert(userRoles).values({ userId: actor.userId, role: "seller" }).onConflictDoNothing();
      await audit({ actorId: actor.userId, action: "business.create", entityType: "business", entityId: businessId, after: { name: d.name } }, tx);
    }
    await tx.delete(businessCommodities).where(eq(businessCommodities.businessId, businessId));
    if (d.commodityIds.length) await tx.insert(businessCommodities).values(d.commodityIds.map((commodityId) => ({ businessId, commodityId }))).onConflictDoNothing();
    // Requests posted before this seller listed these commodities are attached now, so the inbox is not empty.
    const attached = await attachOpenRfqsToBusiness(businessId, d.commodityIds, tx);
    if (attached > 0) {
      await notify(
        { userId: actor.userId, type: "new_rfq", title: `${attached} open buyer request${attached === 1 ? "" : "s"} match your commodities`, body: "Open them to send your offers.", linkPath: "/dashboard/seller/enquiries", entityType: "business", entityId: businessId },
        tx,
      );
    }
    if (d.showPhonePublicly || d.showWhatsappPublicly || d.showAddressPublicly) {
      await tx.insert(userConsents).values({ userId: actor.userId, consentType: "contact_sharing", version: "2026-10", metadata: { phone: d.showPhonePublicly, whatsapp: d.showWhatsappPublicly, address: d.showAddressPublicly } });
    }
    return { businessId, slug, created: !existing };
  });
  if (result.created) await track("seller_onboarding_completed", { entityType: "business", entityId: result.businessId });
  return { ok: true, data: result };
}

export const verificationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, "min").max(10),
  applicantNotes: optionalText(1000).optional(),
});

export async function requestVerification(actor: Actor, raw: z.input<typeof verificationSchema>): Promise<ActionResult<{ verificationId: string }>> {
  const parsed = verificationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: { documentIds: "min" } };
  const business = await getBusinessForUser(actor.userId);
  if (!business) return { ok: false, error: "no_business" };
  if (!(await userCanManageBusiness(actor.userId, business.id))) return { ok: false, error: "forbidden" };
  if (await getOpenVerification(business.id)) return { ok: false, error: "open_request" };
  // Only documents uploaded for this business may be attached.
  const docs = await db
    .select({ id: businessDocuments.id })
    .from(businessDocuments)
    .where(and(eq(businessDocuments.businessId, business.id), inArray(businessDocuments.id, parsed.data.documentIds)));
  if (!docs.length) return { ok: false, error: "validation", fieldErrors: { documentIds: "min" } };
  const verificationId = await db.transaction(async (tx) => {
    const [v] = await tx
      .insert(businessVerifications)
      .values({ businessId: business.id, requestedLevel: "documents_reviewed", status: "submitted", submittedBy: actor.userId, applicantNotes: parsed.data.applicantNotes })
      .returning({ id: businessVerifications.id });
    await tx
      .update(businessDocuments)
      .set({ verificationId: v.id })
      .where(inArray(businessDocuments.id, docs.map((d) => d.id)));
    await notify({ userId: actor.userId, type: "verification_update", title: "Verification request received", body: "A reviewer will check your documents.", linkPath: "/dashboard/seller/verification", entityType: "business_verification", entityId: v.id }, tx);
    await audit({ actorId: actor.userId, action: "verification.request", entityType: "business_verification", entityId: v.id, after: { businessId: business.id, documents: docs.length } }, tx);
    return v.id;
  });
  return { ok: true, data: { verificationId } };
}
