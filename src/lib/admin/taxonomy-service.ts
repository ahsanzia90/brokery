import "server-only";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefinitions,
  businessCommodities,
  categories,
  categoryAttributes,
  categoryUnits,
  commodities,
  commodityAliases,
  commodityGrades,
  commodityVarieties,
  listings,
  locations,
  marketPrices,
  redirects,
  rfqs,
  taxonomyRequests,
  units,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { normalizeText, slugify } from "@/lib/utils/text";
import { revalidateLocations, revalidateTaxonomy } from "./cache";

type CategoryInsert = typeof categories.$inferInsert;
type CommodityInsert = typeof commodities.$inferInsert;

export class TaxonomyError extends Error {}

async function uniqueSlug(table: "categories" | "commodities", base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const rows =
      table === "categories"
        ? await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, candidate))
        : await db.select({ id: commodities.id }).from(commodities).where(eq(commodities.slug, candidate));
    if (!rows.length || (excludeId && rows[0].id === excludeId)) return candidate;
  }
  throw new TaxonomyError("Could not generate unique slug");
}

async function addRedirect(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], source: string, destination: string, actorId: string) {
  if (source === destination) return;
  await tx
    .insert(redirects)
    .values({ sourcePath: source, destinationPath: destination, statusCode: 301, isActive: true, createdBy: actorId })
    .onConflictDoUpdate({ target: redirects.sourcePath, set: { destinationPath: destination, isActive: true, updatedAt: new Date() } });
  // Avoid loops: any redirect pointing at `source` should now point at `destination`.
  await tx.update(redirects).set({ destinationPath: destination }).where(eq(redirects.destinationPath, source));
}

/* ------------------------------------------------------------------ links */
export type AttributeLink = { attributeId: string; isRequired: boolean; displayOrder: number };
export type UnitLink = { unitId: string; isDefault: boolean; sortOrder: number };

async function replaceLinks(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], owner: { categoryId?: string; commodityId?: string }, attrs?: AttributeLink[], unitLinks?: UnitLink[]) {
  const where = owner.categoryId ? eq(categoryAttributes.categoryId, owner.categoryId) : eq(categoryAttributes.commodityId, owner.commodityId!);
  const whereU = owner.categoryId ? eq(categoryUnits.categoryId, owner.categoryId) : eq(categoryUnits.commodityId, owner.commodityId!);
  if (attrs) {
    await tx.delete(categoryAttributes).where(where);
    if (attrs.length) await tx.insert(categoryAttributes).values(attrs.map((a) => ({ ...owner, attributeId: a.attributeId, isRequired: a.isRequired, displayOrder: a.displayOrder })));
  }
  if (unitLinks) {
    await tx.delete(categoryUnits).where(whereU);
    if (unitLinks.length) await tx.insert(categoryUnits).values(unitLinks.map((u) => ({ ...owner, unitId: u.unitId, isDefault: u.isDefault, sortOrder: u.sortOrder })));
  }
}

/* ------------------------------------------------------------- categories */
export type CategoryInput = Omit<Partial<CategoryInsert>, "id" | "createdAt" | "updatedAt"> & { nameEn: string };

export async function createCategory(actorId: string, input: CategoryInput, attrs?: AttributeLink[], unitLinks?: UnitLink[]) {
  const slug = await uniqueSlug("categories", input.slug || input.nameEn);
  const row = await db.transaction(async (tx) => {
    const [row] = await tx.insert(categories).values({ ...input, slug, aliasesRoman: input.aliasesRoman ?? [] }).returning();
    await replaceLinks(tx, { categoryId: row.id }, attrs, unitLinks);
    await audit({ actorId, action: "taxonomy.category.create", entityType: "category", entityId: row.id, after: { nameEn: row.nameEn, slug: row.slug, parentId: row.parentId } }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function updateCategory(actorId: string, id: string, input: Partial<CategoryInput>, attrs?: AttributeLink[], unitLinks?: UnitLink[], reason?: string) {
  const [before] = await db.select().from(categories).where(eq(categories.id, id));
  if (!before) throw new TaxonomyError("Category not found");
  if (input.parentId === id) throw new TaxonomyError("A category cannot be its own parent");
  if (input.parentId) {
    const descendants = await descendantCategoryIds(id);
    if (descendants.includes(input.parentId)) throw new TaxonomyError("Cannot move a category under its own descendant");
  }
  const slug = input.slug !== undefined && input.slug !== before.slug ? await uniqueSlug("categories", input.slug || input.nameEn || before.nameEn, id) : before.slug;
  const row = await db.transaction(async (tx) => {
    const [row] = await tx.update(categories).set({ ...input, slug }).where(eq(categories.id, id)).returning();
    if (slug !== before.slug) await addRedirect(tx, `/categories/${before.slug}`, `/categories/${slug}`, actorId);
    await replaceLinks(tx, { categoryId: id }, attrs, unitLinks);
    const changed: Record<string, unknown> = {};
    const prev: Record<string, unknown> = {};
    for (const k of Object.keys(input) as (keyof typeof input)[]) {
      if (JSON.stringify(before[k as keyof typeof before]) !== JSON.stringify(row[k as keyof typeof row])) {
        prev[k] = before[k as keyof typeof before];
        changed[k] = row[k as keyof typeof row];
      }
    }
    await audit({ actorId, action: "taxonomy.category.update", entityType: "category", entityId: id, before: prev, after: changed, reason }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function descendantCategoryIds(id: string): Promise<string[]> {
  const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const children = new Map<string, string[]>();
  for (const c of all) if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const ch of children.get(cur) ?? []) {
      out.push(ch);
      stack.push(ch);
    }
  }
  return out;
}

/** Counts shown on the "preview before publishing" confirmation step. */
export async function categoryImpact(id: string) {
  const ids = [id, ...(await descendantCategoryIds(id))];
  const [c] = await db.select({ n: count() }).from(commodities).where(sql`${commodities.categoryId} IN ${ids}`);
  const [l] = await db
    .select({ n: count() })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .where(sql`${commodities.categoryId} IN ${ids}`);
  const [p] = await db
    .select({ n: count() })
    .from(marketPrices)
    .innerJoin(commodities, eq(commodities.id, marketPrices.commodityId))
    .where(sql`${commodities.categoryId} IN ${ids}`);
  const [r] = await db
    .select({ n: count() })
    .from(rfqs)
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .where(sql`${commodities.categoryId} IN ${ids}`);
  return { subcategories: ids.length - 1, commodities: c.n, listings: l.n, prices: p.n, rfqs: r.n };
}

export async function setCategoryStatus(actorId: string, id: string, status: "active" | "inactive", reason?: string) {
  return updateCategory(actorId, id, { status }, undefined, undefined, reason);
}

/** Merge category `id` into `targetId`: commodities and child categories move; old slug redirects. */
export async function mergeCategory(actorId: string, id: string, targetId: string, reason: string) {
  if (id === targetId) throw new TaxonomyError("Cannot merge into itself");
  const [src] = await db.select().from(categories).where(eq(categories.id, id));
  const [dst] = await db.select().from(categories).where(eq(categories.id, targetId));
  if (!src || !dst) throw new TaxonomyError("Category not found");
  if ((await descendantCategoryIds(id)).includes(targetId)) throw new TaxonomyError("Cannot merge into a descendant");
  await db.transaction(async (tx) => {
    await tx.update(commodities).set({ categoryId: targetId }).where(eq(commodities.categoryId, id));
    await tx.update(categories).set({ parentId: targetId }).where(eq(categories.parentId, id));
    await tx.update(categories).set({ status: "merged", mergedIntoId: targetId }).where(eq(categories.id, id));
    await addRedirect(tx, `/categories/${src.slug}`, `/categories/${dst.slug}`, actorId);
    await audit({ actorId, action: "taxonomy.category.merge", entityType: "category", entityId: id, before: { slug: src.slug }, after: { mergedIntoId: targetId }, reason }, tx);
  });
  revalidateTaxonomy();
}

export async function swapCategoryOrder(actorId: string, id: string, direction: "up" | "down") {
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (!cat) throw new TaxonomyError("Category not found");
  const siblings = await db
    .select()
    .from(categories)
    .where(cat.parentId ? eq(categories.parentId, cat.parentId) : sql`${categories.parentId} IS NULL`)
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  const idx = siblings.findIndex((s) => s.id === id);
  const other = siblings[direction === "up" ? idx - 1 : idx + 1];
  if (!other) return;
  await db.transaction(async (tx) => {
    // Normalise sort orders to indices first so swaps are deterministic.
    for (let i = 0; i < siblings.length; i++) {
      const target = siblings[i].id === id ? (direction === "up" ? idx - 1 : idx + 1) : siblings[i].id === other.id ? idx : i;
      await tx.update(categories).set({ sortOrder: target }).where(eq(categories.id, siblings[i].id));
    }
    await audit({ actorId, action: "taxonomy.category.reorder", entityType: "category", entityId: id, after: { direction } }, tx);
  });
  revalidateTaxonomy();
}

/* ------------------------------------------------------------ commodities */
export type CommodityInput = Omit<Partial<CommodityInsert>, "id" | "createdAt" | "updatedAt"> & { nameEn: string; categoryId: string };

export async function createCommodity(actorId: string, input: CommodityInput, attrs?: AttributeLink[], unitLinks?: UnitLink[]) {
  const slug = await uniqueSlug("commodities", input.slug || input.nameEn);
  const row = await db.transaction(async (tx) => {
    const [row] = await tx.insert(commodities).values({ ...input, slug }).returning();
    await replaceLinks(tx, { commodityId: row.id }, attrs, unitLinks);
    await syncNameAliases(tx, row.id, null, row.nameEn, row.nameUr);
    await audit({ actorId, action: "taxonomy.commodity.create", entityType: "commodity", entityId: row.id, after: { nameEn: row.nameEn, slug: row.slug, categoryId: row.categoryId } }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function updateCommodity(actorId: string, id: string, input: Partial<CommodityInput>, attrs?: AttributeLink[], unitLinks?: UnitLink[], reason?: string) {
  const [before] = await db.select().from(commodities).where(eq(commodities.id, id));
  if (!before) throw new TaxonomyError("Commodity not found");
  const slug = input.slug !== undefined && input.slug !== before.slug ? await uniqueSlug("commodities", input.slug || input.nameEn || before.nameEn, id) : before.slug;
  const row = await db.transaction(async (tx) => {
    const [row] = await tx.update(commodities).set({ ...input, slug }).where(eq(commodities.id, id)).returning();
    if (slug !== before.slug) {
      await addRedirect(tx, `/commodities/${before.slug}`, `/commodities/${slug}`, actorId);
      await addRedirect(tx, `/prices/${before.slug}`, `/prices/${slug}`, actorId);
    }
    await replaceLinks(tx, { commodityId: id }, attrs, unitLinks);
    if (row.nameEn !== before.nameEn || row.nameUr !== before.nameUr) await syncNameAliases(tx, id, null, row.nameEn, row.nameUr);
    const changed: Record<string, unknown> = {};
    const prev: Record<string, unknown> = {};
    for (const k of Object.keys(input) as (keyof typeof input)[]) {
      if (JSON.stringify(before[k as keyof typeof before]) !== JSON.stringify(row[k as keyof typeof row])) {
        prev[k] = before[k as keyof typeof before];
        changed[k] = row[k as keyof typeof row];
      }
    }
    await audit({ actorId, action: "taxonomy.commodity.update", entityType: "commodity", entityId: id, before: prev, after: changed, reason }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function commodityImpact(id: string) {
  const [l] = await db.select({ n: count() }).from(listings).where(eq(listings.commodityId, id));
  const [p] = await db.select({ n: count() }).from(marketPrices).where(eq(marketPrices.commodityId, id));
  const [r] = await db.select({ n: count() }).from(rfqs).where(eq(rfqs.commodityId, id));
  const [v] = await db.select({ n: count() }).from(commodityVarieties).where(eq(commodityVarieties.commodityId, id));
  const [b] = await db.select({ n: count() }).from(businessCommodities).where(eq(businessCommodities.commodityId, id));
  return { listings: l.n, prices: p.n, rfqs: r.n, varieties: v.n, businesses: b.n };
}

/** Merge commodity `id` into `targetId`. Listings/prices/RFQs/aliases/business links move; varieties and grades move too. */
export async function mergeCommodity(actorId: string, id: string, targetId: string, reason: string) {
  if (id === targetId) throw new TaxonomyError("Cannot merge into itself");
  const [src] = await db.select().from(commodities).where(eq(commodities.id, id));
  const [dst] = await db.select().from(commodities).where(eq(commodities.id, targetId));
  if (!src || !dst) throw new TaxonomyError("Commodity not found");
  await db.transaction(async (tx) => {
    // Varieties/grades: move unless a slug collision exists; colliding ones are deactivated and their references remapped.
    const srcVarieties = await tx.select().from(commodityVarieties).where(eq(commodityVarieties.commodityId, id));
    const dstVarieties = await tx.select().from(commodityVarieties).where(eq(commodityVarieties.commodityId, targetId));
    for (const v of srcVarieties) {
      const collision = dstVarieties.find((d) => d.slug === v.slug);
      if (collision) {
        await tx.update(listings).set({ varietyId: collision.id }).where(eq(listings.varietyId, v.id));
        await tx.update(marketPrices).set({ varietyId: collision.id }).where(eq(marketPrices.varietyId, v.id));
        await tx.update(rfqs).set({ varietyId: collision.id }).where(eq(rfqs.varietyId, v.id));
        await tx.update(commodityGrades).set({ varietyId: collision.id }).where(eq(commodityGrades.varietyId, v.id));
        await tx.update(commodityAliases).set({ varietyId: collision.id }).where(eq(commodityAliases.varietyId, v.id));
        await tx.update(commodityVarieties).set({ status: "merged", slug: `${v.slug}-merged-${v.id.slice(0, 8)}` }).where(eq(commodityVarieties.id, v.id));
      } else {
        await tx.update(commodityVarieties).set({ commodityId: targetId }).where(eq(commodityVarieties.id, v.id));
      }
    }
    const srcGrades = await tx.select().from(commodityGrades).where(eq(commodityGrades.commodityId, id));
    const dstGrades = await tx.select().from(commodityGrades).where(eq(commodityGrades.commodityId, targetId));
    for (const g of srcGrades) {
      const collision = dstGrades.find((d) => d.slug === g.slug);
      if (collision) {
        await tx.update(listings).set({ gradeId: collision.id }).where(eq(listings.gradeId, g.id));
        await tx.update(marketPrices).set({ gradeId: collision.id }).where(eq(marketPrices.gradeId, g.id));
        await tx.update(rfqs).set({ gradeId: collision.id }).where(eq(rfqs.gradeId, g.id));
        await tx.update(commodityGrades).set({ status: "merged", slug: `${g.slug}-merged-${g.id.slice(0, 8)}` }).where(eq(commodityGrades.id, g.id));
      } else {
        await tx.update(commodityGrades).set({ commodityId: targetId }).where(eq(commodityGrades.id, g.id));
      }
    }
    await tx.update(listings).set({ commodityId: targetId }).where(eq(listings.commodityId, id));
    await tx.update(marketPrices).set({ commodityId: targetId }).where(eq(marketPrices.commodityId, id));
    await tx.update(rfqs).set({ commodityId: targetId }).where(eq(rfqs.commodityId, id));
    await tx.update(commodityAliases).set({ commodityId: targetId }).where(eq(commodityAliases.commodityId, id));
    // business_commodities has a unique (business, commodity) index: drop rows that would collide, then move.
    await tx.execute(sql`DELETE FROM business_commodities bc WHERE bc.commodity_id = ${id} AND EXISTS (SELECT 1 FROM business_commodities t WHERE t.business_id = bc.business_id AND t.commodity_id = ${targetId})`);
    await tx.update(businessCommodities).set({ commodityId: targetId }).where(eq(businessCommodities.commodityId, id));
    await tx.update(commodities).set({ status: "merged", mergedIntoId: targetId }).where(eq(commodities.id, id));
    await addRedirect(tx, `/commodities/${src.slug}`, `/commodities/${dst.slug}`, actorId);
    await addRedirect(tx, `/prices/${src.slug}`, `/prices/${dst.slug}`, actorId);
    await audit({ actorId, action: "taxonomy.commodity.merge", entityType: "commodity", entityId: id, before: { slug: src.slug }, after: { mergedIntoId: targetId }, reason }, tx);
  });
  revalidateTaxonomy();
}

/* -------------------------------------------------------------- varieties */
export async function addVariety(actorId: string, commodityId: string, input: { nameEn: string; nameUr?: string | null; aliasesRoman?: string[]; description?: string | null; slug?: string }) {
  const base = slugify(input.slug || input.nameEn);
  const existing = await db.select({ slug: commodityVarieties.slug }).from(commodityVarieties).where(eq(commodityVarieties.commodityId, commodityId));
  const taken = new Set(existing.map((e) => e.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  const [maxRow] = await db.select({ m: sql<number>`coalesce(max(${commodityVarieties.sortOrder}), -1)` }).from(commodityVarieties).where(eq(commodityVarieties.commodityId, commodityId));
  const row = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(commodityVarieties)
      .values({ commodityId, slug, nameEn: input.nameEn, nameUr: input.nameUr ?? null, aliasesRoman: input.aliasesRoman ?? [], description: input.description ?? null, sortOrder: Number(maxRow?.m ?? -1) + 1 })
      .returning();
    await syncNameAliases(tx, commodityId, row.id, row.nameEn, row.nameUr, row.aliasesRoman);
    await audit({ actorId, action: "taxonomy.variety.create", entityType: "commodity_variety", entityId: row.id, after: { commodityId, nameEn: row.nameEn, slug } }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function updateVariety(actorId: string, id: string, input: { nameEn?: string; nameUr?: string | null; aliasesRoman?: string[]; description?: string | null; status?: "active" | "inactive"; sortOrder?: number }) {
  const [before] = await db.select().from(commodityVarieties).where(eq(commodityVarieties.id, id));
  if (!before) throw new TaxonomyError("Variety not found");
  const row = await db.transaction(async (tx) => {
    const [row] = await tx.update(commodityVarieties).set(input).where(eq(commodityVarieties.id, id)).returning();
    if (input.nameEn || input.nameUr !== undefined || input.aliasesRoman) await syncNameAliases(tx, row.commodityId, row.id, row.nameEn, row.nameUr, row.aliasesRoman);
    await audit({ actorId, action: "taxonomy.variety.update", entityType: "commodity_variety", entityId: id, before: { nameEn: before.nameEn, status: before.status }, after: { ...input } }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function swapVarietyOrder(actorId: string, id: string, direction: "up" | "down") {
  const [v] = await db.select().from(commodityVarieties).where(eq(commodityVarieties.id, id));
  if (!v) return;
  const siblings = await db.select().from(commodityVarieties).where(eq(commodityVarieties.commodityId, v.commodityId)).orderBy(asc(commodityVarieties.sortOrder), asc(commodityVarieties.nameEn));
  const idx = siblings.findIndex((s) => s.id === id);
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= siblings.length) return;
  [siblings[idx], siblings[j]] = [siblings[j], siblings[idx]];
  await db.transaction(async (tx) => {
    for (let i = 0; i < siblings.length; i++) await tx.update(commodityVarieties).set({ sortOrder: i }).where(eq(commodityVarieties.id, siblings[i].id));
    await audit({ actorId, action: "taxonomy.variety.reorder", entityType: "commodity_variety", entityId: id, after: { direction } }, tx);
  });
  revalidateTaxonomy();
}

/* ----------------------------------------------------------------- grades */
export async function addGrade(actorId: string, commodityId: string, input: { nameEn: string; nameUr?: string | null; description?: string | null; varietyId?: string | null; slug?: string }) {
  const base = slugify(input.slug || input.nameEn);
  const existing = await db.select({ slug: commodityGrades.slug }).from(commodityGrades).where(eq(commodityGrades.commodityId, commodityId));
  const taken = new Set(existing.map((e) => e.slug));
  let slug = input.varietyId ? `${(await db.select({ slug: commodityVarieties.slug }).from(commodityVarieties).where(eq(commodityVarieties.id, input.varietyId)))[0]?.slug ?? "v"}-${base}` : base;
  const b2 = slug;
  for (let i = 2; taken.has(slug); i++) slug = `${b2}-${i}`;
  const [maxRow] = await db.select({ m: sql<number>`coalesce(max(${commodityGrades.sortOrder}), -1)` }).from(commodityGrades).where(eq(commodityGrades.commodityId, commodityId));
  const row = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(commodityGrades)
      .values({ commodityId, varietyId: input.varietyId ?? null, slug, nameEn: input.nameEn, nameUr: input.nameUr ?? null, description: input.description ?? null, sortOrder: Number(maxRow?.m ?? -1) + 1 })
      .returning();
    await audit({ actorId, action: "taxonomy.grade.create", entityType: "commodity_grade", entityId: row.id, after: { commodityId, nameEn: row.nameEn, varietyId: row.varietyId } }, tx);
    return row;
  });
  revalidateTaxonomy();
  return row;
}

export async function updateGrade(actorId: string, id: string, input: { nameEn?: string; nameUr?: string | null; description?: string | null; status?: "active" | "inactive"; sortOrder?: number }) {
  const [before] = await db.select().from(commodityGrades).where(eq(commodityGrades.id, id));
  if (!before) throw new TaxonomyError("Grade not found");
  const [row] = await db.update(commodityGrades).set(input).where(eq(commodityGrades.id, id)).returning();
  await audit({ actorId, action: "taxonomy.grade.update", entityType: "commodity_grade", entityId: id, before: { nameEn: before.nameEn, status: before.status }, after: { ...input } });
  revalidateTaxonomy();
  return row;
}

/* ---------------------------------------------------------------- aliases */
export async function addAlias(actorId: string, commodityId: string, input: { alias: string; language: "en" | "ur" | "ur_roman" | "other"; region?: string | null; varietyId?: string | null; isApproved?: boolean }) {
  const normalized = normalizeText(input.alias);
  if (!normalized) throw new TaxonomyError("Alias is empty");
  const [existing] = await db
    .select()
    .from(commodityAliases)
    .where(and(eq(commodityAliases.commodityId, commodityId), eq(commodityAliases.normalized, normalized), input.varietyId ? eq(commodityAliases.varietyId, input.varietyId) : sql`${commodityAliases.varietyId} IS NULL`));
  if (existing) return existing;
  const [row] = await db
    .insert(commodityAliases)
    .values({ commodityId, varietyId: input.varietyId ?? null, language: input.language, alias: input.alias.trim(), normalized, region: input.region ?? null, isApproved: input.isApproved ?? true })
    .returning();
  await audit({ actorId, action: "taxonomy.alias.create", entityType: "commodity_alias", entityId: row.id, after: { commodityId, alias: row.alias, language: row.language } });
  revalidateTaxonomy();
  return row;
}

export async function removeAlias(actorId: string, id: string) {
  const [before] = await db.select().from(commodityAliases).where(eq(commodityAliases.id, id));
  if (!before) return;
  await db.delete(commodityAliases).where(eq(commodityAliases.id, id));
  await audit({ actorId, action: "taxonomy.alias.delete", entityType: "commodity_alias", entityId: id, before: { commodityId: before.commodityId, alias: before.alias } });
  revalidateTaxonomy();
}

export async function setAliasApproved(actorId: string, id: string, isApproved: boolean) {
  await db.update(commodityAliases).set({ isApproved }).where(eq(commodityAliases.id, id));
  await audit({ actorId, action: "taxonomy.alias.update", entityType: "commodity_alias", entityId: id, after: { isApproved } });
  revalidateTaxonomy();
}

/** Keep search aliases derived from names in sync (auto-generated entries are tagged language en/ur with region "auto"). */
async function syncNameAliases(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], commodityId: string, varietyId: string | null, nameEn: string, nameUr: string | null, roman: string[] = []) {
  const entries: Array<{ alias: string; language: "en" | "ur" | "ur_roman" }> = [{ alias: nameEn, language: "en" }];
  if (nameUr) entries.push({ alias: nameUr, language: "ur" });
  for (const r of roman) if (r.trim()) entries.push({ alias: r.trim(), language: "ur_roman" });
  for (const e of entries) {
    const normalized = normalizeText(e.alias);
    if (!normalized) continue;
    const [exists] = await tx
      .select({ id: commodityAliases.id })
      .from(commodityAliases)
      .where(and(eq(commodityAliases.commodityId, commodityId), eq(commodityAliases.normalized, normalized), varietyId ? eq(commodityAliases.varietyId, varietyId) : sql`${commodityAliases.varietyId} IS NULL`));
    if (!exists) await tx.insert(commodityAliases).values({ commodityId, varietyId, language: e.language, alias: e.alias, normalized, region: "auto" });
  }
}

/* ------------------------------------------------------------- attributes */
type AttrInsert = typeof attributeDefinitions.$inferInsert;
export async function saveAttribute(actorId: string, input: Omit<AttrInsert, "id" | "createdAt" | "updatedAt">, id?: string) {
  if (!/^[a-z0-9_]+$/.test(input.key)) throw new TaxonomyError("Key must be lowercase letters, digits and underscores");
  if (id) {
    const [before] = await db.select().from(attributeDefinitions).where(eq(attributeDefinitions.id, id));
    const [row] = await db.update(attributeDefinitions).set(input).where(eq(attributeDefinitions.id, id)).returning();
    await audit({ actorId, action: "taxonomy.attribute.update", entityType: "attribute_definition", entityId: id, before: { key: before?.key, nameEn: before?.nameEn, type: before?.type }, after: { key: row.key, nameEn: row.nameEn, type: row.type } });
    revalidateTaxonomy();
    return row;
  }
  const [dup] = await db.select({ id: attributeDefinitions.id }).from(attributeDefinitions).where(eq(attributeDefinitions.key, input.key));
  if (dup) throw new TaxonomyError("An attribute with this key already exists");
  const [row] = await db.insert(attributeDefinitions).values(input).returning();
  await audit({ actorId, action: "taxonomy.attribute.create", entityType: "attribute_definition", entityId: row.id, after: { key: row.key, nameEn: row.nameEn, type: row.type } });
  revalidateTaxonomy();
  return row;
}

/* ------------------------------------------------------------------ units */
type UnitInsert = typeof units.$inferInsert;
export async function saveUnit(actorId: string, input: Omit<UnitInsert, "id" | "createdAt" | "updatedAt">, id?: string) {
  if (!/^[a-z0-9_]+$/.test(input.code)) throw new TaxonomyError("Code must be lowercase letters, digits and underscores");
  if (id) {
    const [before] = await db.select().from(units).where(eq(units.id, id));
    const [row] = await db.update(units).set(input).where(eq(units.id, id)).returning();
    await audit({ actorId, action: "taxonomy.unit.update", entityType: "unit", entityId: id, before: { code: before?.code, baseFactor: before?.baseFactor, status: before?.status }, after: { code: row.code, baseFactor: row.baseFactor, status: row.status } });
    revalidateTaxonomy();
    return row;
  }
  const [dup] = await db.select({ id: units.id }).from(units).where(eq(units.code, input.code));
  if (dup) throw new TaxonomyError("A unit with this code already exists");
  const [row] = await db.insert(units).values(input).returning();
  await audit({ actorId, action: "taxonomy.unit.create", entityType: "unit", entityId: row.id, after: { code: row.code, symbol: row.symbol, unitType: row.unitType } });
  revalidateTaxonomy();
  return row;
}

/* -------------------------------------------------------------- locations */
type LocationInsert = typeof locations.$inferInsert;
export async function saveLocation(actorId: string, input: Omit<LocationInsert, "id" | "createdAt" | "updatedAt" | "path" | "slug"> & { slug?: string }, id?: string) {
  const slug = slugify(input.slug || input.nameEn);
  let parentPath = "";
  if (input.parentId) {
    const [parent] = await db.select().from(locations).where(eq(locations.id, input.parentId));
    if (!parent) throw new TaxonomyError("Parent location not found");
    if (parent.id === id) throw new TaxonomyError("A location cannot be its own parent");
    parentPath = parent.type === "country" ? "" : parent.path;
  }
  // Cities live directly under the province path (district paths use "<slug>-district"), matching the seed convention.
  let path: string;
  if (input.type === "province" || input.type === "country") path = slug;
  else if (input.type === "city") {
    const provincePath = parentPath.split("/")[0] ?? parentPath;
    path = `${provincePath}/${slug}`;
  } else path = parentPath ? `${parentPath}/${slug}` : slug;

  const [dupSlug] = await db.select({ id: locations.id }).from(locations).where(and(eq(locations.type, input.type), eq(locations.slug, slug), id ? ne(locations.id, id) : sql`true`));
  if (dupSlug) throw new TaxonomyError(`A ${input.type} with slug "${slug}" already exists`);
  const [dupPath] = await db.select({ id: locations.id }).from(locations).where(and(eq(locations.path, path), id ? ne(locations.id, id) : sql`true`));
  if (dupPath) throw new TaxonomyError(`Path "${path}" is already used`);

  const row = await db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(locations).where(eq(locations.id, id));
      if (!before) throw new TaxonomyError("Location not found");
      const [row] = await tx.update(locations).set({ ...input, slug, path }).where(eq(locations.id, id)).returning();
      if (before.path !== path) {
        // Update descendant paths (prefix replace) in one statement.
        await tx.execute(sql`UPDATE locations SET path = ${path} || substring(path from ${before.path.length + 1}) WHERE path LIKE ${before.path + "/%"}`);
        await addRedirect(tx, `/markets/${before.path}`, `/markets/${path}`, actorId);
        if (before.type === "city") await addRedirect(tx, `/suppliers/${before.slug}`, `/suppliers/${slug}`, actorId);
      }
      await audit({ actorId, action: "taxonomy.location.update", entityType: "location", entityId: id, before: { nameEn: before.nameEn, path: before.path, status: before.status }, after: { nameEn: row.nameEn, path: row.path, status: row.status } }, tx);
      return row;
    }
    const [row] = await tx.insert(locations).values({ ...input, slug, path }).returning();
    await audit({ actorId, action: "taxonomy.location.create", entityType: "location", entityId: row.id, after: { nameEn: row.nameEn, type: row.type, path: row.path } }, tx);
    return row;
  });
  revalidateLocations();
  return row;
}

/* --------------------------------------------------------------- requests */
export async function resolveTaxonomyRequest(
  actorId: string,
  id: string,
  decision:
    | { action: "reject"; notes: string }
    | { action: "merge"; resolvedEntityId: string; notes?: string }
    | { action: "approve"; notes?: string; nameEn: string; nameUr?: string | null; commodityId?: string | null; categoryId?: string | null; varietyId?: string | null; language?: "en" | "ur" | "ur_roman" | "other" },
) {
  const [req] = await db.select().from(taxonomyRequests).where(eq(taxonomyRequests.id, id));
  if (!req) throw new TaxonomyError("Request not found");
  if (req.status !== "pending") throw new TaxonomyError("Request already resolved");
  let resolvedEntityId: string | null = null;
  if (decision.action === "approve") {
    if (req.requestType === "commodity") {
      if (!decision.categoryId) throw new TaxonomyError("Category is required");
      resolvedEntityId = (await createCommodity(actorId, { nameEn: decision.nameEn, nameUr: decision.nameUr ?? null, categoryId: decision.categoryId })).id;
    } else if (req.requestType === "variety") {
      if (!decision.commodityId) throw new TaxonomyError("Commodity is required");
      resolvedEntityId = (await addVariety(actorId, decision.commodityId, { nameEn: decision.nameEn, nameUr: decision.nameUr ?? null })).id;
    } else if (req.requestType === "grade") {
      if (!decision.commodityId) throw new TaxonomyError("Commodity is required");
      resolvedEntityId = (await addGrade(actorId, decision.commodityId, { nameEn: decision.nameEn, nameUr: decision.nameUr ?? null, varietyId: decision.varietyId ?? null })).id;
    } else if (req.requestType === "alias") {
      if (!decision.commodityId) throw new TaxonomyError("Commodity is required");
      resolvedEntityId = (await addAlias(actorId, decision.commodityId, { alias: decision.nameEn, language: decision.language ?? "ur_roman", region: req.region ?? null, varietyId: decision.varietyId ?? null })).id;
    } else if (req.requestType === "category") {
      resolvedEntityId = (await createCategory(actorId, { nameEn: decision.nameEn, nameUr: decision.nameUr ?? null, parentId: decision.categoryId ?? null })).id;
    } else throw new TaxonomyError(`Unknown request type ${req.requestType}`);
  } else if (decision.action === "merge") {
    resolvedEntityId = decision.resolvedEntityId;
  }
  // Best effort: fix up the listing that triggered the request.
  const listingId = (req.metadata as { listingId?: string } | null)?.listingId;
  if (listingId && resolvedEntityId && decision.action !== "reject") {
    if (req.requestType === "variety") await db.update(listings).set({ varietyId: resolvedEntityId, customVariety: null }).where(eq(listings.id, listingId));
    if (req.requestType === "grade") await db.update(listings).set({ gradeId: resolvedEntityId, customGrade: null }).where(eq(listings.id, listingId));
  }
  const status = decision.action === "reject" ? "rejected" : decision.action === "merge" ? "merged" : "approved";
  await db.update(taxonomyRequests).set({ status, reviewerId: actorId, reviewNotes: decision.notes ?? null, resolvedEntityId }).where(eq(taxonomyRequests.id, id));
  await audit({ actorId, action: `taxonomy.request.${status}`, entityType: "taxonomy_request", entityId: id, before: { status: "pending" }, after: { status, resolvedEntityId }, reason: decision.notes ?? null });
  revalidateTaxonomy();
  return resolvedEntityId;
}
