import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { businessDocuments, businessVerifications, businesses, listings, locations, profiles } from "@/db/schema";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { getStorage } from "@/lib/storage";
import type { Role } from "@/lib/auth/session";
import { AuthError } from "@/lib/authz/guards";
import { revalidatePath } from "next/cache";

type VerificationStatus = (typeof businessVerifications.status.enumValues)[number];
type Level = (typeof businesses.verificationLevel.enumValues)[number];

export async function listVerifications(f: { status?: string; q?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(businessVerifications.status, f.status as VerificationStatus));
  if (f.q) conds.push(ilike(businesses.name, `%${f.q}%`));
  const where = conds.length ? and(...conds) : undefined;
  const base = db.select({ v: businessVerifications, b: businesses, owner: profiles, docs: sql<number>`(SELECT count(*) FROM business_documents d WHERE d.verification_id = ${businessVerifications.id} AND d.deleted_at IS NULL)` }).from(businessVerifications).innerJoin(businesses, eq(businesses.id, businessVerifications.businessId)).innerJoin(profiles, eq(profiles.id, businesses.ownerId));
  const [{ n: total }] = await db.select({ n: count() }).from(businessVerifications).innerJoin(businesses, eq(businesses.id, businessVerifications.businessId)).where(where);
  const rows = await base.where(where).orderBy(sql`CASE ${businessVerifications.status} WHEN 'submitted' THEN 0 WHEN 'under_review' THEN 1 WHEN 'more_info_requested' THEN 2 ELSE 3 END`, desc(businessVerifications.createdAt)).limit(pageSize).offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getVerificationDetail(id: string) {
  const [row] = await db.select({ v: businessVerifications, b: businesses, owner: profiles }).from(businessVerifications).innerJoin(businesses, eq(businesses.id, businessVerifications.businessId)).innerJoin(profiles, eq(profiles.id, businesses.ownerId)).where(eq(businessVerifications.id, id)).limit(1);
  if (!row) return null;
  const [docs, reviewer, city, history] = await Promise.all([
    db.select().from(businessDocuments).where(and(eq(businessDocuments.businessId, row.b.id), isNull(businessDocuments.deletedAt))).orderBy(desc(businessDocuments.createdAt)),
    row.v.reviewerId ? db.select({ id: profiles.id, name: profiles.name }).from(profiles).where(eq(profiles.id, row.v.reviewerId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    row.b.cityId ? db.select().from(locations).where(eq(locations.id, row.b.cityId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    db.select().from(businessVerifications).where(eq(businessVerifications.businessId, row.b.id)).orderBy(desc(businessVerifications.createdAt)),
  ]);
  return { ...row, docs, reviewer, city, history };
}

export async function claimVerification(actorId: string, id: string) {
  await db.transaction(async (tx) => {
    const [v] = await tx.select().from(businessVerifications).where(eq(businessVerifications.id, id));
    if (!v) throw new Error("Not found");
    if (!["submitted", "more_info_requested"].includes(v.status)) throw new Error("Only submitted requests can be claimed");
    await tx.update(businessVerifications).set({ status: "under_review", reviewerId: actorId }).where(eq(businessVerifications.id, id));
    await audit({ actorId, action: "verification.claim", entityType: "business_verification", entityId: id, before: { status: v.status }, after: { status: "under_review" } }, tx);
  });
}

export async function approveVerification(actorId: string, id: string, level: Level, reason: string) {
  if (!["documents_reviewed", "admin_verified"].includes(level)) throw new Error("Invalid verification level");
  await db.transaction(async (tx) => {
    const [v] = await tx.select().from(businessVerifications).where(eq(businessVerifications.id, id));
    if (!v) throw new Error("Not found");
    if (["approved", "rejected"].includes(v.status)) throw new Error("Request already decided");
    const [b] = await tx.select().from(businesses).where(eq(businesses.id, v.businessId));
    await tx.update(businessVerifications).set({ status: "approved", reviewerId: actorId, reviewReason: reason || null, reviewedAt: new Date() }).where(eq(businessVerifications.id, id));
    await tx.update(businesses).set({ verificationLevel: level }).where(eq(businesses.id, v.businessId));
    await audit({ actorId, action: "verification.approve", entityType: "business_verification", entityId: id, before: { status: v.status, verificationLevel: b.verificationLevel }, after: { status: "approved", verificationLevel: level }, reason }, tx);
    await notify({ userId: b.ownerId, type: "verification_update", title: `Verification approved: ${b.name}`, body: `Your business is now labelled "${level === "admin_verified" ? "Admin verified" : "Business documents reviewed"}".${reason ? " " + reason : ""}`, linkPath: "/dashboard/seller/verification", entityType: "business", entityId: b.id }, tx);
  });
  revalidatePath("/suppliers");
}

export async function rejectVerification(actorId: string, id: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const [v] = await tx.select().from(businessVerifications).where(eq(businessVerifications.id, id));
    if (!v) throw new Error("Not found");
    if (["approved", "rejected"].includes(v.status)) throw new Error("Request already decided");
    const [b] = await tx.select().from(businesses).where(eq(businesses.id, v.businessId));
    await tx.update(businessVerifications).set({ status: "rejected", reviewerId: actorId, reviewReason: reason, reviewedAt: new Date() }).where(eq(businessVerifications.id, id));
    await audit({ actorId, action: "verification.reject", entityType: "business_verification", entityId: id, before: { status: v.status }, after: { status: "rejected" }, reason }, tx);
    await notify({ userId: b.ownerId, type: "verification_update", title: `Verification not approved: ${b.name}`, body: reason, linkPath: "/dashboard/seller/verification", entityType: "business", entityId: b.id }, tx);
  });
}

export async function requestMoreInfo(actorId: string, id: string, message: string) {
  if (!message.trim()) throw new Error("Message is required");
  await db.transaction(async (tx) => {
    const [v] = await tx.select().from(businessVerifications).where(eq(businessVerifications.id, id));
    if (!v) throw new Error("Not found");
    const [b] = await tx.select().from(businesses).where(eq(businesses.id, v.businessId));
    await tx.update(businessVerifications).set({ status: "more_info_requested", reviewerId: actorId, reviewReason: message }).where(eq(businessVerifications.id, id));
    await audit({ actorId, action: "verification.request_info", entityType: "business_verification", entityId: id, before: { status: v.status }, after: { status: "more_info_requested" }, reason: message }, tx);
    await notify({ userId: b.ownerId, type: "admin_request_info", title: `More information needed: ${b.name}`, body: message, linkPath: "/dashboard/seller/verification", entityType: "business", entityId: b.id }, tx);
  });
}

export async function setDocumentRetention(actorId: string, documentId: string, retentionUntil: Date | null) {
  await db.transaction(async (tx) => {
    const [d] = await tx.select().from(businessDocuments).where(eq(businessDocuments.id, documentId));
    if (!d) throw new Error("Not found");
    await tx.update(businessDocuments).set({ retentionUntil }).where(eq(businessDocuments.id, documentId));
    await audit({ actorId, action: "document.retention", entityType: "business_document", entityId: documentId, before: { retentionUntil: d.retentionUntil }, after: { retentionUntil } }, tx);
  });
}

export async function deleteDocument(actorId: string, documentId: string, reason: string) {
  const [d] = await db.select().from(businessDocuments).where(eq(businessDocuments.id, documentId));
  if (!d) throw new Error("Not found");
  await getStorage().delete("private", d.storagePath);
  await db.transaction(async (tx) => {
    await tx.update(businessDocuments).set({ deletedAt: new Date() }).where(eq(businessDocuments.id, documentId));
    await audit({ actorId, action: "document.delete", entityType: "business_document", entityId: documentId, before: { documentType: d.documentType }, reason }, tx);
  });
}

/** Purge documents past their retention date (call from maintenance route). */
export async function purgeExpiredDocuments(): Promise<number> {
  const rows = await db.select().from(businessDocuments).where(and(isNull(businessDocuments.deletedAt), sql`${businessDocuments.retentionUntil} IS NOT NULL AND ${businessDocuments.retentionUntil} < now()`)).limit(100);
  for (const d of rows) {
    await getStorage().delete("private", d.storagePath);
    await db.update(businessDocuments).set({ deletedAt: new Date() }).where(eq(businessDocuments.id, d.id));
  }
  return rows.length;
}

/* ---------------- Businesses directory ---------------- */

export async function listBusinesses(f: { q?: string; status?: string; level?: string; featured?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.q) conds.push(or(ilike(businesses.name, `%${f.q}%`), ilike(businesses.slug, `%${f.q}%`))!);
  if (f.status) conds.push(eq(businesses.status, f.status as (typeof businesses.status.enumValues)[number]));
  if (f.level) conds.push(eq(businesses.verificationLevel, f.level as Level));
  if (f.featured === "1") conds.push(eq(businesses.isFeatured, true));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(businesses).where(where);
  const rows = await db
    .select({ b: businesses, owner: profiles, city: locations, listingCount: sql<number>`(SELECT count(*) FROM listings l WHERE l.business_id = ${businesses.id} AND l.status = 'published')`, openReports: sql<number>`(SELECT count(*) FROM listing_reports r WHERE r.business_id = ${businesses.id} AND r.status IN ('open','under_review'))` })
    .from(businesses)
    .innerJoin(profiles, eq(profiles.id, businesses.ownerId))
    .leftJoin(locations, eq(locations.id, businesses.cityId))
    .where(where)
    .orderBy(desc(businesses.createdAt))
    .limit(pageSize)
    .offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getBusinessDetail(id: string) {
  const [row] = await db.select({ b: businesses, owner: profiles, city: locations }).from(businesses).innerJoin(profiles, eq(profiles.id, businesses.ownerId)).leftJoin(locations, eq(locations.id, businesses.cityId)).where(eq(businesses.id, id)).limit(1);
  if (!row) return null;
  const [verifications, recentListings, docs] = await Promise.all([
    db.select().from(businessVerifications).where(eq(businessVerifications.businessId, id)).orderBy(desc(businessVerifications.createdAt)),
    db.select({ id: listings.id, slug: listings.slug, title: listings.title, status: listings.status, createdAt: listings.createdAt }).from(listings).where(eq(listings.businessId, id)).orderBy(desc(listings.createdAt)).limit(20),
    db.select().from(businessDocuments).where(and(eq(businessDocuments.businessId, id), isNull(businessDocuments.deletedAt))),
  ]);
  return { ...row, verifications, recentListings, docs };
}

export async function setBusinessFeatured(actorId: string, id: string, featured: boolean, until: Date | null) {
  await db.transaction(async (tx) => {
    const [b] = await tx.select({ isFeatured: businesses.isFeatured, featuredUntil: businesses.featuredUntil }).from(businesses).where(eq(businesses.id, id));
    if (!b) throw new Error("Not found");
    await tx.update(businesses).set({ isFeatured: featured, featuredUntil: featured ? until : null }).where(eq(businesses.id, id));
    await audit({ actorId, action: "business.feature", entityType: "business", entityId: id, before: { isFeatured: b.isFeatured, featuredUntil: b.featuredUntil }, after: { isFeatured: featured, featuredUntil: until } }, tx);
  });
  revalidatePath("/");
}

export async function setBusinessStatus(actorId: string, id: string, status: "active" | "suspended" | "closed", reason: string) {
  if (status !== "active" && !reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const [b] = await tx.select({ status: businesses.status, ownerId: businesses.ownerId, name: businesses.name }).from(businesses).where(eq(businesses.id, id));
    if (!b) throw new Error("Not found");
    await tx.update(businesses).set({ status }).where(eq(businesses.id, id));
    await audit({ actorId, action: "business.status", entityType: "business", entityId: id, before: { status: b.status }, after: { status }, reason }, tx);
    await notify({ userId: b.ownerId, type: "system", title: `Business ${status === "active" ? "reactivated" : status}: ${b.name}`, body: reason || undefined, linkPath: "/dashboard/seller/business", entityType: "business", entityId: id }, tx);
  });
  revalidatePath("/suppliers");
}

export async function setVerificationLevel(actor: { id: string; roles: Role[] }, id: string, level: Level, reason: string) {
  if (!actor.roles.includes("super_admin")) throw new AuthError("forbidden", "Only a super admin can set the level directly");
  if (!reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const [b] = await tx.select({ verificationLevel: businesses.verificationLevel, ownerId: businesses.ownerId, name: businesses.name }).from(businesses).where(eq(businesses.id, id));
    if (!b) throw new Error("Not found");
    await tx.update(businesses).set({ verificationLevel: level }).where(eq(businesses.id, id));
    await audit({ actorId: actor.id, action: "business.verification_level", entityType: "business", entityId: id, before: { verificationLevel: b.verificationLevel }, after: { verificationLevel: level }, reason }, tx);
    await notify({ userId: b.ownerId, type: "verification_update", title: `Verification label updated: ${b.name}`, body: reason, linkPath: "/dashboard/seller/verification", entityType: "business", entityId: id }, tx);
  });
  revalidatePath("/suppliers");
}

export const VERIFICATION_STATUSES = ["submitted", "under_review", "more_info_requested", "approved", "rejected"] as const;
export const VERIFICATION_LEVELS = ["none", "phone_verified", "documents_reviewed", "admin_verified"] as const;
