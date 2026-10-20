"use server";
import { requirePermission, requireSuperAdmin } from "@/lib/authz/guards";
import { back, fd, fdAll, fdBool, fdInt, fdList, fdNullable, runAdmin } from "@/lib/admin/action-utils";
import * as svc from "@/lib/admin/taxonomy-service";
import { getStorage, newObjectKey } from "@/lib/storage";
import { processListingImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/storage/images";

async function maybeUploadImage(formData: FormData, key: string, prefix: string): Promise<string | undefined> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Image must be JPG, PNG or WebP");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is too large");
  const processed = await processListingImage(Buffer.from(await file.arrayBuffer()));
  const objectKey = newObjectKey(prefix, processed.ext);
  await getStorage().put("public", objectKey, processed.data, processed.contentType);
  return objectKey;
}

function parseAttributeLinks(formData: FormData): svc.AttributeLink[] {
  const ids = fdAll(formData, "attr");
  return ids.map((id, i) => ({ attributeId: id, isRequired: fdBool(formData, `attr_required_${id}`), displayOrder: fdInt(formData, `attr_order_${id}`, i) }));
}
function parseUnitLinks(formData: FormData): svc.UnitLink[] {
  const ids = fdAll(formData, "unit");
  const def = fd(formData, "unit_default");
  return ids.map((id, i) => ({ unitId: id, isDefault: id === def, sortOrder: i }));
}

const nullableEnum = <T extends string>(v: string, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const LISTING_KINDS = ["commodity", "agricultural_input", "industrial_material", "equipment", "livestock", "other"] as const;
const MOD_LEVELS = ["auto", "review", "restricted", "prohibited"] as const;

export async function saveCategoryAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fdNullable(formData, "id");
  const errorPath = id ? `/admin/taxonomy/categories/${id}/edit` : "/admin/taxonomy/categories/new";
  const row = await runAdmin(async () => {
    const imagePath = await maybeUploadImage(formData, "image", "categories");
    const input: svc.CategoryInput = {
      nameEn: fd(formData, "nameEn"),
      nameUr: fdNullable(formData, "nameUr"),
      slug: fd(formData, "slug"),
      aliasesRoman: fdList(formData, "aliasesRoman"),
      parentId: fdNullable(formData, "parentId"),
      description: fdNullable(formData, "description"),
      descriptionUr: fdNullable(formData, "descriptionUr"),
      icon: fdNullable(formData, "icon"),
      listingKind: nullableEnum(fd(formData, "listingKind"), LISTING_KINDS) ?? "commodity",
      moderationLevel: nullableEnum(fd(formData, "moderationLevel"), MOD_LEVELS) ?? "review",
      supportsGrades: fdBool(formData, "supportsGrades"),
      supportsPriceBenchmark: fdBool(formData, "supportsPriceBenchmark"),
      defaultUnitId: fdNullable(formData, "defaultUnitId"),
      status: fd(formData, "status") === "inactive" ? "inactive" : "active",
      isFeatured: fdBool(formData, "isFeatured"),
      sortOrder: fdInt(formData, "sortOrder", 0),
      seoTitle: fdNullable(formData, "seoTitle"),
      seoDescription: fdNullable(formData, "seoDescription"),
      ...(imagePath ? { imagePath } : {}),
    };
    if (!input.nameEn) throw new Error("English name is required");
    if (fdBool(formData, "removeImage")) input.imagePath = null;
    return id ? svc.updateCategory(user.id, id, input, parseAttributeLinks(formData), parseUnitLinks(formData)) : svc.createCategory(user.id, input, parseAttributeLinks(formData), parseUnitLinks(formData));
  }, errorPath);
  back(`/admin/taxonomy/categories/${row.id}/edit`, { ok: id ? "Category saved." : "Category created." });
}

export async function reorderCategoryAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fd(formData, "id");
  const direction = fd(formData, "direction") === "up" ? "up" : "down";
  await runAdmin(() => svc.swapCategoryOrder(user.id, id, direction), "/admin/taxonomy");
  back(`/admin/taxonomy#cat-${id}`, { ok: "Order updated." });
}

export async function setCategoryStatusAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fd(formData, "id");
  const status = fd(formData, "status") === "active" ? "active" : "inactive";
  await runAdmin(() => svc.setCategoryStatus(user.id, id, status, fdNullable(formData, "reason") ?? undefined), `/admin/taxonomy/categories/${id}/confirm?action=${status}`);
  back("/admin/taxonomy", { ok: `Category ${status === "active" ? "reactivated" : "deactivated"}.` });
}

export async function mergeCategoryAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = fd(formData, "id");
  const targetId = fd(formData, "targetId");
  const reason = fd(formData, "reason");
  if (!reason) back(`/admin/taxonomy/categories/${id}/confirm?action=merge&target=${targetId}`, { error: "A reason is required." });
  await runAdmin(() => svc.mergeCategory(user.id, id, targetId, reason), `/admin/taxonomy/categories/${id}/confirm?action=merge&target=${targetId}`);
  back("/admin/taxonomy", { ok: "Category merged. Old URLs now redirect." });
}

export async function saveCommodityAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fdNullable(formData, "id");
  const errorPath = id ? `/admin/taxonomy/commodities/${id}/edit` : `/admin/taxonomy/commodities/new?category=${fd(formData, "categoryId")}`;
  const row = await runAdmin(async () => {
    const imagePath = await maybeUploadImage(formData, "image", "commodities");
    const input: svc.CommodityInput = {
      nameEn: fd(formData, "nameEn"),
      nameUr: fdNullable(formData, "nameUr"),
      slug: fd(formData, "slug"),
      categoryId: fd(formData, "categoryId"),
      description: fdNullable(formData, "description"),
      descriptionUr: fdNullable(formData, "descriptionUr"),
      listingKind: nullableEnum(fd(formData, "listingKind"), LISTING_KINDS),
      moderationLevel: nullableEnum(fd(formData, "moderationLevel"), MOD_LEVELS),
      supportsVarieties: fdBool(formData, "supportsVarieties"),
      supportsGrades: fdBool(formData, "supportsGrades"),
      supportsPriceBenchmark: fdBool(formData, "supportsPriceBenchmark"),
      defaultUnitId: fdNullable(formData, "defaultUnitId"),
      status: fd(formData, "status") === "inactive" ? "inactive" : "active",
      isPopular: fdBool(formData, "isPopular"),
      sortOrder: fdInt(formData, "sortOrder", 0),
      seoTitle: fdNullable(formData, "seoTitle"),
      seoDescription: fdNullable(formData, "seoDescription"),
      ...(imagePath ? { imagePath } : {}),
    };
    if (!input.nameEn) throw new Error("English name is required");
    if (!input.categoryId) throw new Error("Category is required");
    if (fdBool(formData, "removeImage")) input.imagePath = null;
    const attrs = fdBool(formData, "overrideAttributes") ? parseAttributeLinks(formData) : [];
    const unitLinks = fdBool(formData, "overrideUnits") ? parseUnitLinks(formData) : [];
    return id ? svc.updateCommodity(user.id, id, input, attrs, unitLinks) : svc.createCommodity(user.id, input, attrs, unitLinks);
  }, errorPath);
  back(`/admin/taxonomy/commodities/${row.id}/edit`, { ok: id ? "Commodity saved." : "Commodity created." });
}

export async function setCommodityStatusAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fd(formData, "id");
  const status = fd(formData, "status") === "active" ? "active" : "inactive";
  await runAdmin(() => svc.updateCommodity(user.id, id, { status }, undefined, undefined, fdNullable(formData, "reason") ?? undefined), `/admin/taxonomy/commodities/${id}/confirm?action=${status}`);
  back(`/admin/taxonomy/commodities/${id}/edit`, { ok: `Commodity ${status === "active" ? "reactivated" : "deactivated"}.` });
}

export async function mergeCommodityAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = fd(formData, "id");
  const targetId = fd(formData, "targetId");
  const reason = fd(formData, "reason");
  const p = `/admin/taxonomy/commodities/${id}/confirm?action=merge&target=${targetId}`;
  if (!reason) back(p, { error: "A reason is required." });
  await runAdmin(() => svc.mergeCommodity(user.id, id, targetId, reason), p);
  back(`/admin/taxonomy/commodities/${targetId}/edit`, { ok: "Commodity merged. Listings, prices, requests and aliases moved; old URLs redirect." });
}

/* varieties / grades / aliases (sub-forms on the commodity edit page) */
export async function addVarietyAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  await runAdmin(() => {
    if (!fd(formData, "nameEn")) throw new Error("Variety name is required");
    return svc.addVariety(user.id, commodityId, { nameEn: fd(formData, "nameEn"), nameUr: fdNullable(formData, "nameUr"), aliasesRoman: fdList(formData, "aliasesRoman"), description: fdNullable(formData, "description") });
  }, p);
  back(`${p}#varieties`, { ok: "Variety added." });
}
export async function updateVarietyAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  const id = fd(formData, "id");
  const op = fd(formData, "op");
  await runAdmin(async () => {
    if (op === "up" || op === "down") return svc.swapVarietyOrder(user.id, id, op);
    if (op === "deactivate") return svc.updateVariety(user.id, id, { status: "inactive" });
    if (op === "activate") return svc.updateVariety(user.id, id, { status: "active" });
    return svc.updateVariety(user.id, id, { nameEn: fd(formData, "nameEn") || undefined, nameUr: fdNullable(formData, "nameUr"), aliasesRoman: fdList(formData, "aliasesRoman") });
  }, p);
  back(`${p}#varieties`, { ok: "Variety updated." });
}
export async function addGradeAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  await runAdmin(() => {
    if (!fd(formData, "nameEn")) throw new Error("Grade name is required");
    return svc.addGrade(user.id, commodityId, { nameEn: fd(formData, "nameEn"), nameUr: fdNullable(formData, "nameUr"), description: fdNullable(formData, "description"), varietyId: fdNullable(formData, "varietyId") });
  }, p);
  back(`${p}#grades`, { ok: "Grade added." });
}
export async function updateGradeAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  const id = fd(formData, "id");
  const op = fd(formData, "op");
  await runAdmin(async () => {
    if (op === "deactivate") return svc.updateGrade(user.id, id, { status: "inactive" });
    if (op === "activate") return svc.updateGrade(user.id, id, { status: "active" });
    return svc.updateGrade(user.id, id, { nameEn: fd(formData, "nameEn") || undefined, nameUr: fdNullable(formData, "nameUr") });
  }, p);
  back(`${p}#grades`, { ok: "Grade updated." });
}
export async function addAliasAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  await runAdmin(() => {
    const language = nullableEnum(fd(formData, "language"), ["en", "ur", "ur_roman", "other"] as const) ?? "ur_roman";
    return svc.addAlias(user.id, commodityId, { alias: fd(formData, "alias"), language, region: fdNullable(formData, "region"), varietyId: fdNullable(formData, "varietyId") });
  }, p);
  back(`${p}#aliases`, { ok: "Alias added." });
}
export async function removeAliasAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const commodityId = fd(formData, "commodityId");
  const p = `/admin/taxonomy/commodities/${commodityId}/edit`;
  const op = fd(formData, "op");
  await runAdmin(() => (op === "approve" ? svc.setAliasApproved(user.id, fd(formData, "id"), true) : op === "unapprove" ? svc.setAliasApproved(user.id, fd(formData, "id"), false) : svc.removeAlias(user.id, fd(formData, "id"))), p);
  back(`${p}#aliases`, { ok: "Alias updated." });
}

/* attributes / units / locations */
export async function saveAttributeAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fdNullable(formData, "id");
  const p = id ? `/admin/taxonomy/attributes/${id}/edit` : "/admin/taxonomy/attributes/new";
  const row = await runAdmin(
    () =>
      svc.saveAttribute(
        user.id,
        {
          key: fd(formData, "key"),
          nameEn: fd(formData, "nameEn"),
          nameUr: fdNullable(formData, "nameUr"),
          type: nullableEnum(fd(formData, "type"), ["text", "number", "select", "multiselect", "boolean", "date"] as const) ?? "text",
          unitLabel: fdNullable(formData, "unitLabel"),
          allowedValues: fdList(formData, "allowedValues").length ? fdList(formData, "allowedValues") : null,
          minValue: fdNullable(formData, "minValue"),
          maxValue: fdNullable(formData, "maxValue"),
          isFilterable: fdBool(formData, "isFilterable"),
          helpText: fdNullable(formData, "helpText"),
        },
        id ?? undefined,
      ),
    p,
  );
  back(`/admin/taxonomy/attributes/${row.id}/edit`, { ok: "Attribute saved." });
}

export async function saveUnitAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fdNullable(formData, "id");
  const p = id ? `/admin/taxonomy/units/${id}/edit` : "/admin/taxonomy/units/new";
  const row = await runAdmin(
    () =>
      svc.saveUnit(
        user.id,
        {
          code: fd(formData, "code"),
          nameEn: fd(formData, "nameEn"),
          nameUr: fdNullable(formData, "nameUr"),
          symbol: fd(formData, "symbol"),
          unitType: nullableEnum(fd(formData, "unitType"), ["mass", "volume", "count", "length", "area", "package"] as const) ?? "package",
          baseFactor: fdNullable(formData, "baseFactor"),
          conversionNote: fdNullable(formData, "conversionNote"),
          applicableKinds: fdList(formData, "applicableKinds"),
          status: fd(formData, "status") === "inactive" ? "inactive" : "active",
          sortOrder: fdInt(formData, "sortOrder", 0),
        },
        id ?? undefined,
      ),
    p,
  );
  back(`/admin/taxonomy/units/${row.id}/edit`, { ok: "Unit saved." });
}

export async function saveLocationAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fdNullable(formData, "id");
  const p = id ? `/admin/taxonomy/locations/${id}/edit` : "/admin/taxonomy/locations/new";
  const row = await runAdmin(
    () =>
      svc.saveLocation(
        user.id,
        {
          type: nullableEnum(fd(formData, "type"), ["country", "province", "district", "city", "market"] as const) ?? "city",
          parentId: fdNullable(formData, "parentId"),
          slug: fd(formData, "slug") || undefined,
          nameEn: fd(formData, "nameEn"),
          nameUr: fdNullable(formData, "nameUr"),
          aliasesRoman: fdList(formData, "aliasesRoman"),
          isMajorMarket: fdBool(formData, "isMajorMarket"),
          status: fd(formData, "status") === "inactive" ? "inactive" : "active",
          sortOrder: fdInt(formData, "sortOrder", 0),
        },
        id ?? undefined,
      ),
    p,
  );
  back(`/admin/taxonomy/locations/${row.id}/edit`, { ok: "Location saved." });
}

export async function resolveRequestAction(formData: FormData) {
  const user = await requirePermission("taxonomy.manage");
  const id = fd(formData, "id");
  const p = `/admin/taxonomy/requests/${id}`;
  const action = fd(formData, "action");
  await runAdmin(async () => {
    if (action === "reject") {
      if (!fd(formData, "notes")) throw new Error("Please give a reason");
      return svc.resolveTaxonomyRequest(user.id, id, { action: "reject", notes: fd(formData, "notes") });
    }
    if (action === "merge") {
      if (!fd(formData, "resolvedEntityId")) throw new Error("Select the existing entry to merge into");
      return svc.resolveTaxonomyRequest(user.id, id, { action: "merge", resolvedEntityId: fd(formData, "resolvedEntityId"), notes: fdNullable(formData, "notes") ?? undefined });
    }
    return svc.resolveTaxonomyRequest(user.id, id, {
      action: "approve",
      notes: fdNullable(formData, "notes") ?? undefined,
      nameEn: fd(formData, "nameEn"),
      nameUr: fdNullable(formData, "nameUr"),
      commodityId: fdNullable(formData, "commodityId"),
      categoryId: fdNullable(formData, "categoryId"),
      varietyId: fdNullable(formData, "varietyId"),
      language: nullableEnum(fd(formData, "language"), ["en", "ur", "ur_roman", "other"] as const) ?? undefined,
    });
  }, p);
  back("/admin/taxonomy/requests", { ok: `Request ${action === "reject" ? "rejected" : action === "merge" ? "merged" : "approved"}.` });
}
