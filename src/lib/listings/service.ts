import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  attributeDefinitions,
  businesses,
  commodities,
  commodityGrades,
  commodityVarieties,
  listingAttributes,
  listingDocuments,
  listingImages,
  listingStatusHistory,
  listings,
  locations,
  taxonomyRequests,
  units,
} from "@/db/schema";
import { getAttributesForCommodity, getModerationLevel, getUnits, toKilograms } from "@/lib/data/taxonomy";
import { getSetting } from "@/lib/config/settings";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics/track";
import { randomSuffix, slugify } from "@/lib/utils/text";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/validation/common";
import { userCanManageBusiness } from "@/lib/business/queries";
import { listingPayloadSchema, type ListingPayload, type ListingPayloadParsed, type StatusAction } from "./schema";

export type ListingActor = { userId: string; businessId: string };
export type ListingRow = typeof listings.$inferSelect;
type ListingStatus = ListingRow["status"];

async function assertActor(actor: ListingActor): Promise<ActionResult | null> {
  if (!(await userCanManageBusiness(actor.userId, actor.businessId))) return { ok: false, error: "forbidden" };
  const [biz] = await db.select({ status: businesses.status }).from(businesses).where(eq(businesses.id, actor.businessId)).limit(1);
  if (!biz || biz.status !== "active") return { ok: false, error: "business_inactive" };
  return null;
}

/** Decide the status a submitted listing gets, based on moderation configuration. */
export async function decideSubmitStatus(moderationLevel: "auto" | "review" | "restricted" | "prohibited", verificationLevel: string): Promise<ListingStatus> {
  if (moderationLevel === "auto") return "published";
  if (moderationLevel === "restricted") return "pending_review";
  const requireModeration = await getSetting<boolean>("listings.require_moderation", true);
  if (!requireModeration) return "published";
  const autoVerified = await getSetting<boolean>("moderation.auto_publish_verified_sellers", false);
  if (autoVerified && (verificationLevel === "documents_reviewed" || verificationLevel === "admin_verified")) return "published";
  return "pending_review";
}

async function validateReferences(d: ListingPayloadParsed): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, d.commodityId)).limit(1);
  if (!commodity || commodity.status !== "active") {
    errors.commodityId = "invalid";
    return errors;
  }
  if (d.varietyId) {
    const [v] = await db.select({ id: commodityVarieties.id }).from(commodityVarieties).where(and(eq(commodityVarieties.id, d.varietyId), eq(commodityVarieties.commodityId, d.commodityId))).limit(1);
    if (!v) errors.varietyId = "invalid";
  }
  if (d.gradeId) {
    const [g] = await db.select({ id: commodityGrades.id }).from(commodityGrades).where(and(eq(commodityGrades.id, d.gradeId), eq(commodityGrades.commodityId, d.commodityId))).limit(1);
    if (!g) errors.gradeId = "invalid";
  }
  const allUnits = await getUnits();
  const unitIds = new Set(allUnits.map((u) => u.id));
  if (!unitIds.has(d.unitId)) errors.unitId = "invalid";
  if (d.priceUnitId && !unitIds.has(d.priceUnitId)) errors.priceUnitId = "invalid";
  if (d.minOrderUnitId && !unitIds.has(d.minOrderUnitId)) errors.minOrderUnitId = "invalid";
  const locIds = [d.provinceId, d.districtId, d.cityId, d.marketId].filter(Boolean) as string[];
  if (locIds.length) {
    const rows = await db.select({ id: locations.id, type: locations.type }).from(locations).where(inArray(locations.id, locIds));
    const byId = new Map(rows.map((r) => [r.id, r.type]));
    if (d.provinceId && byId.get(d.provinceId) !== "province") errors.provinceId = "invalid";
    if (d.districtId && byId.get(d.districtId) !== "district") errors.districtId = "invalid";
    if (d.cityId && byId.get(d.cityId) !== "city") errors.cityId = "invalid";
    if (d.marketId && byId.get(d.marketId) !== "market") errors.marketId = "invalid";
  }
  // Attributes: must be applicable to this commodity; required ones present on submit.
  const applicable = await getAttributesForCommodity(commodity);
  const applicableById = new Map(applicable.map((a) => [a.id, a]));
  for (const id of Object.keys(d.attributes)) if (!applicableById.has(id)) errors[`attributes.${id}`] = "invalid";
  if (d.submit) for (const a of applicable) if (a.isRequired && !(d.attributes[a.id] ?? "").trim()) errors[`attributes.${a.id}`] = "required";
  for (const [id, value] of Object.entries(d.attributes)) {
    const a = applicableById.get(id);
    if (!a || !value.trim()) continue;
    if (a.type === "number" && !Number.isFinite(Number(value))) errors[`attributes.${id}`] = "invalid_number";
    if (a.type === "select" && a.allowedValues?.length && !a.allowedValues.includes(value)) errors[`attributes.${id}`] = "invalid";
  }
  // Listing documents must belong to this business' private prefix.
  return errors;
}

function attributeValues(attrDefs: Map<string, typeof attributeDefinitions.$inferSelect>, listingId: string, attrs: Record<string, string>) {
  const rows: (typeof listingAttributes.$inferInsert)[] = [];
  for (const [attributeId, raw] of Object.entries(attrs)) {
    const value = raw.trim();
    if (!value) continue;
    const def = attrDefs.get(attributeId);
    const row: typeof listingAttributes.$inferInsert = { listingId, attributeId };
    if (def?.type === "number") row.valueNumber = String(Number(value));
    else if (def?.type === "boolean") row.valueBoolean = value === "true" || value === "yes" || value === "1";
    else if (def?.type === "date") row.valueDate = value;
    else row.valueText = value.slice(0, 200);
    rows.push(row);
  }
  return rows;
}

async function replaceChildren(tx: Tx, listingId: string, d: ListingPayloadParsed, actor: ListingActor) {
  const defs = await tx.select().from(attributeDefinitions);
  const defMap = new Map(defs.map((x) => [x.id, x]));
  await tx.delete(listingAttributes).where(eq(listingAttributes.listingId, listingId));
  const attrRows = attributeValues(defMap, listingId, d.attributes);
  if (attrRows.length) await tx.insert(listingAttributes).values(attrRows);
  await tx.delete(listingImages).where(eq(listingImages.listingId, listingId));
  if (d.images.length) await tx.insert(listingImages).values(d.images.map((img, i) => ({ listingId, storagePath: img.path, altText: img.altText ?? null, sortOrder: i, moderationStatus: "pending" as const })));
  await tx.delete(listingDocuments).where(eq(listingDocuments.listingId, listingId));
  const docs = d.documents.filter((doc) => doc.path.startsWith(`listing-docs/${actor.businessId}/`));
  if (docs.length) await tx.insert(listingDocuments).values(docs.map((doc) => ({ listingId, label: doc.label, storagePath: doc.path, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, isPublic: doc.isPublic })));
}

async function createTaxonomyRequests(tx: Tx, actor: ListingActor, d: ListingPayloadParsed, listingId: string) {
  if (d.customVariety && !d.varietyId) {
    await tx.insert(taxonomyRequests).values({ requestedBy: actor.userId, requestType: "variety", commodityId: d.commodityId, proposedName: d.customVariety, notes: `From listing ${listingId}`, metadata: { listingId } });
  }
  if (d.customGrade && !d.gradeId) {
    await tx.insert(taxonomyRequests).values({ requestedBy: actor.userId, requestType: "grade", commodityId: d.commodityId, proposedName: d.customGrade, notes: `From listing ${listingId}`, metadata: { listingId, varietyId: d.varietyId } });
  }
}

export type ListingResult = { listingId: string; slug: string; status: ListingStatus };

export async function createListing(actor: ListingActor, raw: ListingPayload): Promise<ActionResult<ListingResult>> {
  const denied = await assertActor(actor);
  if (denied) return denied;
  const parsed = listingPayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrorsFromZod(parsed.error) };
  const d = parsed.data;
  const refErrors = await validateReferences(d);
  if (Object.keys(refErrors).length) return { ok: false, error: "validation", fieldErrors: refErrors };

  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, d.commodityId)).limit(1);
  const moderationLevel = await getModerationLevel(commodity);
  if (moderationLevel === "prohibited") return { ok: false, error: "prohibited" };
  const ownDocs = d.documents.filter((doc) => doc.path.startsWith(`listing-docs/${actor.businessId}/`));
  if (moderationLevel === "restricted" && d.submit && ownDocs.length === 0) return { ok: false, error: "validation", fieldErrors: { documents: "required" } };

  const perDay = await getSetting<number>("rate_limits.listing_create_per_day", 20);
  try {
    await enforceRateLimit(`listing_create:${actor.userId}`, Number(perDay), 24 * 60 * 60);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }

  const [biz] = await db.select({ verificationLevel: businesses.verificationLevel }).from(businesses).where(eq(businesses.id, actor.businessId)).limit(1);
  const status: ListingStatus = d.submit ? await decideSubmitStatus(moderationLevel, biz.verificationLevel) : "draft";
  const expiryDays = Number(await getSetting<number>("listings.default_expiry_days", 30));
  const maundKg = Number(await getSetting<number>("units.maund_kg", 40));
  const unit = (await getUnits()).find((u) => u.id === d.unitId);
  const quantityKg = toKilograms(d.quantity, unit, maundKg);
  const slug = `${slugify(d.title).slice(0, 70)}-${randomSuffix(6)}`;

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(listings)
      .values({
        businessId: actor.businessId,
        createdBy: actor.userId,
        commodityId: d.commodityId,
        varietyId: d.varietyId,
        gradeId: d.gradeId,
        customVariety: d.varietyId ? null : d.customVariety ?? null,
        customGrade: d.gradeId ? null : d.customGrade ?? null,
        slug,
        title: d.title,
        description: d.description ?? null,
        priceType: d.priceType,
        priceAmount: d.priceType === "fixed" || d.priceType === "negotiable" ? (d.priceAmount ? String(d.priceAmount) : null) : null,
        priceUnitId: d.priceAmount ? d.priceUnitId : null,
        quantity: String(d.quantity),
        unitId: d.unitId,
        quantityKg: quantityKg === null ? null : quantityKg.toFixed(3),
        minOrderQuantity: d.minOrderQuantity ? String(d.minOrderQuantity) : null,
        minOrderUnitId: d.minOrderQuantity ? d.minOrderUnitId : null,
        provinceId: d.provinceId,
        districtId: d.districtId,
        cityId: d.cityId,
        marketId: d.marketId,
        pickupLocation: d.pickupLocation ?? null,
        deliveryAvailable: d.deliveryAvailable,
        condition: d.condition,
        packaging: d.packaging ?? null,
        availableFrom: d.availableFrom,
        status,
        publishedAt: status === "published" ? new Date() : null,
        expiresAt: new Date(Date.now() + expiryDays * 86_400_000),
        contactPhoneEnabled: d.contactPhoneEnabled,
        contactWhatsappEnabled: d.contactWhatsappEnabled,
      })
      .returning({ id: listings.id, slug: listings.slug });
    await replaceChildren(tx, row.id, d, actor);
    await createTaxonomyRequests(tx, actor, d, row.id);
    await tx.insert(listingStatusHistory).values({ listingId: row.id, previousStatus: null, newStatus: status, actorId: actor.userId, reason: d.submit ? `submitted (${moderationLevel})` : "draft saved" });
    if (status !== "draft") {
      await notify(
        {
          userId: actor.userId,
          type: "listing_submitted",
          title: status === "published" ? "Your listing is live" : "Listing submitted for review",
          body: d.title,
          linkPath: `/dashboard/seller/listings/${row.id}`,
          entityType: "listing",
          entityId: row.id,
        },
        tx,
      );
    }
    await audit({ actorId: actor.userId, action: "listing.seller.create", entityType: "listing", entityId: row.id, after: { status, title: d.title, commodityId: d.commodityId } }, tx);
    return { listingId: row.id, slug: row.slug, status };
  });
  if (d.submit) await track("listing_created", { entityType: "listing", entityId: result.listingId, properties: { status, moderationLevel } });
  return { ok: true, data: result };
}

export async function getOwnedListing(actor: ListingActor, listingId: string): Promise<ListingRow | null> {
  const [row] = await db.select().from(listings).where(and(eq(listings.id, listingId), eq(listings.businessId, actor.businessId))).limit(1);
  return row ?? null;
}

const MAJOR_FIELDS: Array<keyof ListingRow> = ["title", "description", "priceAmount", "priceType", "priceUnitId", "commodityId", "varietyId", "gradeId"];

/**
 * Update an owned listing. Editing a published/pending listing of a commodity whose moderation
 * level is not "auto" sends it back to pending_review when title/description/price/commodity/images change.
 * Minor fields (quantity, location, packaging, contact flags…) keep the current status.
 */
export async function updateListing(actor: ListingActor, listingId: string, raw: ListingPayload): Promise<ActionResult<ListingResult>> {
  const denied = await assertActor(actor);
  if (denied) return denied;
  const existing = await getOwnedListing(actor, listingId);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.status === "removed") return { ok: false, error: "removed" };
  const parsed = listingPayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrorsFromZod(parsed.error) };
  const d = parsed.data;
  const refErrors = await validateReferences(d);
  if (Object.keys(refErrors).length) return { ok: false, error: "validation", fieldErrors: refErrors };
  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, d.commodityId)).limit(1);
  const moderationLevel = await getModerationLevel(commodity);
  if (moderationLevel === "prohibited") return { ok: false, error: "prohibited" };
  const ownDocs = d.documents.filter((doc) => doc.path.startsWith(`listing-docs/${actor.businessId}/`));
  if (moderationLevel === "restricted" && d.submit && ownDocs.length === 0) return { ok: false, error: "validation", fieldErrors: { documents: "required" } };
  const [biz] = await db.select({ verificationLevel: businesses.verificationLevel }).from(businesses).where(eq(businesses.id, actor.businessId)).limit(1);
  const maundKg = Number(await getSetting<number>("units.maund_kg", 40));
  const unit = (await getUnits()).find((u) => u.id === d.unitId);
  const quantityKg = toKilograms(d.quantity, unit, maundKg);

  const newValues = {
    commodityId: d.commodityId,
    varietyId: d.varietyId,
    gradeId: d.gradeId,
    customVariety: d.varietyId ? null : d.customVariety ?? null,
    customGrade: d.gradeId ? null : d.customGrade ?? null,
    title: d.title,
    description: d.description ?? null,
    priceType: d.priceType,
    priceAmount: d.priceType === "fixed" || d.priceType === "negotiable" ? (d.priceAmount ? String(Number(d.priceAmount).toFixed(2)) : null) : null,
    priceUnitId: d.priceAmount ? d.priceUnitId : null,
    quantity: String(d.quantity),
    unitId: d.unitId,
    quantityKg: quantityKg === null ? null : quantityKg.toFixed(3),
    minOrderQuantity: d.minOrderQuantity ? String(d.minOrderQuantity) : null,
    minOrderUnitId: d.minOrderQuantity ? d.minOrderUnitId : null,
    provinceId: d.provinceId,
    districtId: d.districtId,
    cityId: d.cityId,
    marketId: d.marketId,
    pickupLocation: d.pickupLocation ?? null,
    deliveryAvailable: d.deliveryAvailable,
    condition: d.condition,
    packaging: d.packaging ?? null,
    availableFrom: d.availableFrom,
    contactPhoneEnabled: d.contactPhoneEnabled,
    contactWhatsappEnabled: d.contactWhatsappEnabled,
  };

  const oldImages = await db.select({ storagePath: listingImages.storagePath }).from(listingImages).where(eq(listingImages.listingId, listingId)).orderBy(listingImages.sortOrder);
  const imagesChanged = JSON.stringify(oldImages.map((i) => i.storagePath)) !== JSON.stringify(d.images.map((i) => i.path));
  const majorChanged =
    imagesChanged ||
    MAJOR_FIELDS.some((f) => {
      const a = existing[f];
      const b = (newValues as Record<string, unknown>)[f as string];
      if (f === "priceAmount") return Number(a ?? 0) !== Number(b ?? 0);
      return (a ?? null) !== (b ?? null);
    });

  let status: ListingStatus = existing.status;
  let reason: string | null = null;
  if (existing.status === "draft" || existing.status === "rejected") {
    if (d.submit) {
      status = await decideSubmitStatus(moderationLevel, biz.verificationLevel);
      reason = `submitted (${moderationLevel})`;
    }
  } else if ((existing.status === "published" || existing.status === "paused" || existing.status === "expired" || existing.status === "sold_out") && majorChanged && moderationLevel !== "auto") {
    const requireModeration = await getSetting<boolean>("listings.require_moderation", true);
    if (requireModeration || moderationLevel === "restricted") {
      status = "pending_review";
      reason = "edited: major fields changed";
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ ...newValues, status, ...(status === "published" && existing.status !== "published" ? { publishedAt: new Date() } : {}), lastRefreshedAt: new Date() })
      .where(eq(listings.id, listingId));
    await replaceChildren(tx, listingId, d, actor);
    await createTaxonomyRequests(tx, actor, d, listingId);
    if (status !== existing.status) {
      await tx.insert(listingStatusHistory).values({ listingId, previousStatus: existing.status, newStatus: status, actorId: actor.userId, reason });
      if (status === "pending_review" || status === "published") {
        await notify({ userId: actor.userId, type: "listing_submitted", title: status === "published" ? "Your listing is live" : "Listing sent for review", body: d.title, linkPath: `/dashboard/seller/listings/${listingId}`, entityType: "listing", entityId: listingId }, tx);
      }
    }
    await audit({ actorId: actor.userId, action: "listing.seller.update", entityType: "listing", entityId: listingId, before: { status: existing.status, title: existing.title }, after: { status, title: d.title, majorChanged } }, tx);
  });
  return { ok: true, data: { listingId, slug: existing.slug, status } };
}

export async function setListingStatus(actor: ListingActor, listingId: string, action: StatusAction): Promise<ActionResult<{ status: ListingStatus }>> {
  const denied = await assertActor(actor);
  if (denied) return denied;
  const existing = await getOwnedListing(actor, listingId);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.status === "removed") return { ok: false, error: "removed" };
  let status: ListingStatus = existing.status;
  let availability = existing.availability;
  const patch: Partial<typeof listings.$inferInsert> = {};
  switch (action) {
    case "pause":
      if (existing.status !== "published") return { ok: false, error: "invalid_transition" };
      status = "paused";
      break;
    case "resume":
      if (!["paused", "expired", "sold_out"].includes(existing.status)) return { ok: false, error: "invalid_transition" };
      status = "published";
      availability = "available";
      patch.publishedAt = existing.publishedAt ?? new Date();
      if (existing.status === "expired") {
        const expiryDays = Number(await getSetting<number>("listings.default_expiry_days", 30));
        patch.expiresAt = new Date(Date.now() + expiryDays * 86_400_000);
      }
      break;
    case "sold_out":
      if (!["published", "paused"].includes(existing.status)) return { ok: false, error: "invalid_transition" };
      status = "sold_out";
      availability = "sold_out";
      break;
    case "available":
      if (existing.status !== "sold_out") return { ok: false, error: "invalid_transition" };
      status = "published";
      availability = "available";
      break;
    case "remove":
      status = "removed";
      break;
    case "refresh": {
      if (!["published", "expired"].includes(existing.status)) return { ok: false, error: "invalid_transition" };
      const expiryDays = Number(await getSetting<number>("listings.default_expiry_days", 30));
      status = "published";
      patch.expiresAt = new Date(Date.now() + expiryDays * 86_400_000);
      break;
    }
  }
  await db.transaction(async (tx) => {
    await tx.update(listings).set({ ...patch, status, availability, lastRefreshedAt: new Date() }).where(eq(listings.id, listingId));
    if (status !== existing.status) await tx.insert(listingStatusHistory).values({ listingId, previousStatus: existing.status, newStatus: status, actorId: actor.userId, reason: `seller: ${action}` });
    await audit({ actorId: actor.userId, action: `listing.seller.${action}`, entityType: "listing", entityId: listingId, before: { status: existing.status }, after: { status } }, tx);
  });
  return { ok: true, data: { status } };
}

export async function deleteDraft(actor: ListingActor, listingId: string): Promise<ActionResult> {
  const denied = await assertActor(actor);
  if (denied) return denied;
  const existing = await getOwnedListing(actor, listingId);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.status !== "draft") return { ok: false, error: "invalid_transition" };
  await db.delete(listings).where(eq(listings.id, listingId));
  await audit({ actorId: actor.userId, action: "listing.seller.delete_draft", entityType: "listing", entityId: listingId, before: { title: existing.title } });
  return { ok: true };
}

/** Seller-side listing list with joined display fields. */
export async function getSellerListings(businessId: string, status?: ListingStatus | "all") {
  const rows = await db
    .select({
      l: listings,
      commodityName: commodities.nameEn,
      commodityNameUr: commodities.nameUr,
      unitSymbol: units.symbol,
      cityName: locations.nameEn,
      cityNameUr: locations.nameUr,
      image: sql<string | null>`(SELECT storage_path FROM listing_images li WHERE li.listing_id = ${listings.id} ORDER BY li.sort_order LIMIT 1)`,
    })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .where(and(eq(listings.businessId, businessId), sql`${listings.status} <> 'removed'`, status && status !== "all" ? eq(listings.status, status) : undefined))
    .orderBy(desc(listings.updatedAt))
    .limit(200);
  return rows;
}

/** Full payload for the edit wizard. */
export async function getListingForEdit(actor: ListingActor, listingId: string): Promise<(ListingPayload & { id: string; status: ListingStatus; commoditySlug: string }) | null> {
  const row = await getOwnedListing(actor, listingId);
  if (!row) return null;
  const [imgs, docs, attrs, [commodity]] = await Promise.all([
    db.select().from(listingImages).where(eq(listingImages.listingId, listingId)).orderBy(listingImages.sortOrder),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, listingId)),
    db.select({ a: listingAttributes, def: attributeDefinitions }).from(listingAttributes).innerJoin(attributeDefinitions, eq(attributeDefinitions.id, listingAttributes.attributeId)).where(eq(listingAttributes.listingId, listingId)),
    db.select({ slug: commodities.slug }).from(commodities).where(eq(commodities.id, row.commodityId)).limit(1),
  ]);
  const attributes: Record<string, string> = {};
  for (const r of attrs) {
    attributes[r.a.attributeId] = r.def.type === "number" ? String(Number(r.a.valueNumber ?? "")) : r.def.type === "boolean" ? (r.a.valueBoolean ? "true" : "false") : r.def.type === "date" ? r.a.valueDate ?? "" : r.a.valueText ?? "";
  }
  return {
    id: row.id,
    status: row.status,
    commoditySlug: commodity?.slug ?? "",
    commodityId: row.commodityId,
    varietyId: row.varietyId,
    customVariety: row.customVariety,
    gradeId: row.gradeId,
    customGrade: row.customGrade,
    title: row.title,
    quantity: row.quantity,
    unitId: row.unitId,
    minOrderQuantity: row.minOrderQuantity,
    minOrderUnitId: row.minOrderUnitId,
    priceType: row.priceType,
    priceAmount: row.priceAmount,
    priceUnitId: row.priceUnitId,
    provinceId: row.provinceId,
    districtId: row.districtId,
    cityId: row.cityId,
    marketId: row.marketId,
    pickupLocation: row.pickupLocation,
    deliveryAvailable: row.deliveryAvailable,
    condition: row.condition,
    packaging: row.packaging,
    availableFrom: row.availableFrom,
    description: row.description,
    images: imgs.map((i) => ({ path: i.storagePath, altText: i.altText })),
    documents: docs.map((d) => ({ path: d.storagePath, label: d.label, mimeType: d.mimeType, sizeBytes: d.sizeBytes, isPublic: d.isPublic })),
    attributes,
    contactPhoneEnabled: row.contactPhoneEnabled,
    contactWhatsappEnabled: row.contactWhatsappEnabled,
    submit: true,
  };
}
