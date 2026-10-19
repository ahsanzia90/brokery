import "server-only";
import { and, count, desc, eq, exists, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefinitions,
  businesses,
  categories,
  commodities,
  commodityGrades,
  commodityVarieties,
  listingAttributes,
  listingDocuments,
  listingImages,
  listingReports,
  listingStatusHistory,
  listings,
  locations,
  profiles,
  supportCases,
  units,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics/track";
import { getSetting } from "@/lib/config/settings";
import { makeReference } from "@/lib/utils/ids";
import { revalidatePath } from "next/cache";

type ListingStatus = (typeof listings.status.enumValues)[number];

export async function listListings(f: { status?: string; q?: string; city?: string; business?: string; flagged?: string; restricted?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.status && f.status !== "all") conds.push(eq(listings.status, f.status as ListingStatus));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(or(ilike(listings.title, like), ilike(commodities.nameEn, like), ilike(businesses.name, like))!);
  }
  if (f.city) conds.push(ilike(locations.nameEn, `%${f.city}%`));
  if (f.business) conds.push(eq(listings.businessId, f.business));
  if (f.flagged === "1") conds.push(exists(db.select({ one: sql`1` }).from(listingReports).where(and(eq(listingReports.listingId, listings.id), inArray(listingReports.status, ["open", "under_review"])))));
  if (f.restricted === "1") conds.push(sql`coalesce(${commodities.moderationLevel}, ${categories.moderationLevel}) = 'restricted'`);
  const where = conds.length ? and(...conds) : undefined;
  const base = () =>
    db
      .select({ l: listings, commodity: commodities, biz: businesses, city: locations, unit: units, reports: sql<number>`(SELECT count(*) FROM listing_reports r WHERE r.listing_id = ${listings.id} AND r.status IN ('open','under_review'))` })
      .from(listings)
      .innerJoin(commodities, eq(commodities.id, listings.commodityId))
      .innerJoin(categories, eq(categories.id, commodities.categoryId))
      .innerJoin(businesses, eq(businesses.id, listings.businessId))
      .innerJoin(units, eq(units.id, listings.unitId))
      .leftJoin(locations, eq(locations.id, listings.cityId));
  const [{ n: total }] = await db.select({ n: count() }).from(listings).innerJoin(commodities, eq(commodities.id, listings.commodityId)).innerJoin(categories, eq(categories.id, commodities.categoryId)).innerJoin(businesses, eq(businesses.id, listings.businessId)).leftJoin(locations, eq(locations.id, listings.cityId)).where(where);
  const rows = await base().where(where).orderBy(desc(listings.createdAt)).limit(pageSize).offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getListingDetail(id: string) {
  const [row] = await db
    .select({ l: listings, commodity: commodities, category: categories, variety: commodityVarieties, grade: commodityGrades, biz: businesses, seller: profiles, unit: units, city: locations })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .innerJoin(categories, eq(categories.id, commodities.categoryId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, listings.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, listings.gradeId))
    .innerJoin(businesses, eq(businesses.id, listings.businessId))
    .innerJoin(profiles, eq(profiles.id, listings.createdBy))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .where(eq(listings.id, id))
    .limit(1);
  if (!row) return null;
  const [images, attrs, docs, history, reports, priceUnit, duplicates] = await Promise.all([
    db.select().from(listingImages).where(eq(listingImages.listingId, id)).orderBy(listingImages.sortOrder),
    db.select({ a: listingAttributes, def: attributeDefinitions }).from(listingAttributes).innerJoin(attributeDefinitions, eq(attributeDefinitions.id, listingAttributes.attributeId)).where(eq(listingAttributes.listingId, id)),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, id)),
    db.select({ h: listingStatusHistory, actor: profiles }).from(listingStatusHistory).leftJoin(profiles, eq(profiles.id, listingStatusHistory.actorId)).where(eq(listingStatusHistory.listingId, id)).orderBy(desc(listingStatusHistory.createdAt)),
    db.select().from(listingReports).where(eq(listingReports.listingId, id)).orderBy(desc(listingReports.createdAt)),
    row.l.priceUnitId ? db.select().from(units).where(eq(units.id, row.l.priceUnitId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    db
      .select({ id: listings.id, slug: listings.slug, title: listings.title, status: listings.status, createdAt: listings.createdAt, sim: sql<number>`similarity(lower(${listings.title}), lower(${row.l.title}))` })
      .from(listings)
      .where(and(eq(listings.businessId, row.l.businessId), eq(listings.commodityId, row.l.commodityId), ne(listings.id, id), ne(listings.status, "removed")))
      .orderBy(desc(sql`similarity(lower(${listings.title}), lower(${row.l.title}))`))
      .limit(10),
  ]);
  return { ...row, images, attrs, docs, history, reports, priceUnit, duplicates };
}

async function transition(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string, actorId: string, newStatus: ListingStatus, reason: string | null, extra: Partial<typeof listings.$inferInsert> = {}) {
  const [l] = await tx.select().from(listings).where(eq(listings.id, id));
  if (!l) throw new Error("Listing not found");
  await tx.update(listings).set({ status: newStatus, statusReason: reason, moderatedBy: actorId, moderatedAt: new Date(), ...extra }).where(eq(listings.id, id));
  await tx.insert(listingStatusHistory).values({ listingId: id, previousStatus: l.status, newStatus, actorId, reason });
  return l;
}

async function ownerOf(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], businessId: string) {
  const [b] = await tx.select({ ownerId: businesses.ownerId, name: businesses.name }).from(businesses).where(eq(businesses.id, businessId));
  return b;
}

export async function approveListing(actorId: string, id: string, reason?: string) {
  const expiryDays = await getSetting<number>("listings.default_expiry_days", 30);
  await db.transaction(async (tx) => {
    const [cur] = await tx.select({ status: listings.status, expiresAt: listings.expiresAt }).from(listings).where(eq(listings.id, id));
    if (!cur) throw new Error("Listing not found");
    if (!["pending_review", "draft", "rejected", "paused"].includes(cur.status)) throw new Error(`Cannot approve a listing with status ${cur.status}`);
    const l = await transition(tx, id, actorId, "published", reason ?? null, { publishedAt: new Date(), expiresAt: cur.expiresAt && cur.expiresAt > new Date() ? cur.expiresAt : new Date(Date.now() + expiryDays * 86_400_000) });
    await tx.update(listingImages).set({ moderationStatus: "approved" }).where(and(eq(listingImages.listingId, id), eq(listingImages.moderationStatus, "pending")));
    await audit({ actorId, action: "listing.approve", entityType: "listing", entityId: id, before: { status: l.status }, after: { status: "published" }, reason: reason ?? null }, tx);
    const b = await ownerOf(tx, l.businessId);
    await notify({ userId: b.ownerId, type: "listing_approved", title: `Listing published: ${l.title}`, body: "Your listing is now visible to buyers.", linkPath: `/listings/${l.slug}`, entityType: "listing", entityId: id }, tx);
  });
  await track("listing_approved", { entityType: "listing", entityId: id });
  revalidatePath("/");
  revalidatePath("/listings");
}

export async function bulkApprove(actorId: string, ids: string[]) {
  let ok = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await approveListing(actorId, id);
      ok++;
    } catch (e) {
      errors.push(`${id}: ${(e as Error).message}`);
    }
  }
  return { ok, errors };
}

export async function rejectListing(actorId: string, id: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const l = await transition(tx, id, actorId, "rejected", reason);
    await audit({ actorId, action: "listing.reject", entityType: "listing", entityId: id, before: { status: l.status }, after: { status: "rejected" }, reason }, tx);
    const b = await ownerOf(tx, l.businessId);
    await notify({ userId: b.ownerId, type: "listing_rejected", title: `Listing not approved: ${l.title}`, body: reason, linkPath: `/dashboard/seller/listings/${id}`, entityType: "listing", entityId: id }, tx);
  });
  revalidatePath("/listings");
}

export async function requestListingEdits(actorId: string, id: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const l = await transition(tx, id, actorId, "draft", reason);
    await audit({ actorId, action: "listing.request_edits", entityType: "listing", entityId: id, before: { status: l.status }, after: { status: "draft" }, reason }, tx);
    const b = await ownerOf(tx, l.businessId);
    await notify({ userId: b.ownerId, type: "listing_edit_requested", title: `Changes needed: ${l.title}`, body: reason, linkPath: `/dashboard/seller/listings/${id}/edit`, entityType: "listing", entityId: id }, tx);
  });
  revalidatePath("/listings");
}

export async function hideListing(actorId: string, id: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  await db.transaction(async (tx) => {
    const l = await transition(tx, id, actorId, "removed", reason);
    await audit({ actorId, action: "listing.hide", entityType: "listing", entityId: id, before: { status: l.status }, after: { status: "removed" }, reason }, tx);
    const b = await ownerOf(tx, l.businessId);
    await notify({ userId: b.ownerId, type: "listing_rejected", title: `Listing removed: ${l.title}`, body: reason, linkPath: `/dashboard/seller/listings/${id}`, entityType: "listing", entityId: id }, tx);
  });
  revalidatePath("/listings");
}

export async function setListingFeatured(actorId: string, id: string, featured: boolean) {
  await db.transaction(async (tx) => {
    await tx.update(listings).set({ isFeatured: featured }).where(eq(listings.id, id));
    await audit({ actorId, action: "listing.feature", entityType: "listing", entityId: id, after: { isFeatured: featured } }, tx);
  });
  revalidatePath("/");
}

export async function setImageModeration(actorId: string, imageId: string, status: "approved" | "rejected") {
  await db.transaction(async (tx) => {
    const [img] = await tx.select().from(listingImages).where(eq(listingImages.id, imageId));
    if (!img) throw new Error("Image not found");
    await tx.update(listingImages).set({ moderationStatus: status }).where(eq(listingImages.id, imageId));
    await audit({ actorId, action: "listing.image." + status, entityType: "listing", entityId: img.listingId, before: { imageId, moderationStatus: img.moderationStatus }, after: { imageId, moderationStatus: status } }, tx);
  });
}

export async function flagSuspiciousPrice(actorId: string, id: string, note: string) {
  const [l] = await db.select({ title: listings.title, businessId: listings.businessId }).from(listings).where(eq(listings.id, id));
  if (!l) throw new Error("Listing not found");
  let reference = makeReference("CASE");
  for (let i = 0; i < 3; i++) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(supportCases).values({ reference, caseType: "misleading_price", severity: "medium", status: "open", reporterId: actorId, subject: `Suspicious price: ${l.title}`, description: note || null, entityType: "listing", entityId: id, assignedTo: actorId });
        await audit({ actorId, action: "listing.flag_price", entityType: "listing", entityId: id, after: { caseReference: reference }, reason: note }, tx);
      });
      return reference;
    } catch (e) {
      if (!String((e as Error).message).includes("support_cases_reference_uq")) throw e;
      reference = makeReference("CASE");
    }
  }
  throw new Error("Could not create case");
}

export const LISTING_STATUSES: ListingStatus[] = ["pending_review", "published", "draft", "rejected", "paused", "expired", "sold_out", "removed"];
