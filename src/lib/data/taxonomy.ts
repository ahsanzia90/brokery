import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  attributeDefinitions,
  categories,
  categoryAttributes,
  categoryUnits,
  commodities,
  commodityGrades,
  commodityVarieties,
  units,
} from "@/db/schema";

export type CategoryRow = typeof categories.$inferSelect;
export type CommodityRow = typeof commodities.$inferSelect;
export type VarietyRow = typeof commodityVarieties.$inferSelect;
export type GradeRow = typeof commodityGrades.$inferSelect;
export type UnitRow = typeof units.$inferSelect;
export type AttributeRow = typeof attributeDefinitions.$inferSelect;

export type CategoryNode = CategoryRow & { children: CategoryNode[] };

/** Full active category tree, cached and tagged for invalidation from admin. */
export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const rows = await db.select().from(categories).where(eq(categories.status, "active")).orderBy(asc(categories.sortOrder), asc(categories.nameEn));
    const byId = new Map<string, CategoryNode>();
    for (const r of rows) byId.set(r.id, { ...r, children: [] });
    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  },
  ["category-tree"],
  { tags: ["taxonomy"], revalidate: 300 },
);

export const getAllCategories = unstable_cache(
  async () => db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn)),
  ["all-categories"],
  { tags: ["taxonomy"], revalidate: 300 },
);

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

/** Ancestors from root → category (inclusive). */
export async function getCategoryAncestors(categoryId: string): Promise<CategoryRow[]> {
  const all = await getAllCategories();
  const byId = new Map(all.map((c) => [c.id, c]));
  const chain: CategoryRow[] = [];
  let cur = byId.get(categoryId);
  let guard = 0;
  while (cur && guard++ < 10) {
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

export async function getDescendantCategoryIds(categoryId: string): Promise<string[]> {
  const all = await getAllCategories();
  const children = new Map<string, string[]>();
  for (const c of all) {
    if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
  }
  const out: string[] = [categoryId];
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const ch of children.get(id) ?? []) {
      out.push(ch);
      stack.push(ch);
    }
  }
  return out;
}

export async function getCommoditiesInCategory(categoryId: string, includeDescendants = true): Promise<CommodityRow[]> {
  const ids = includeDescendants ? await getDescendantCategoryIds(categoryId) : [categoryId];
  return db
    .select()
    .from(commodities)
    .where(and(inArray(commodities.categoryId, ids), eq(commodities.status, "active")))
    .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn));
}

export async function getCommodityBySlug(slug: string): Promise<CommodityRow | null> {
  const [row] = await db.select().from(commodities).where(eq(commodities.slug, slug)).limit(1);
  return row ?? null;
}

export async function getCommodityById(id: string): Promise<CommodityRow | null> {
  const [row] = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
  return row ?? null;
}

export const getPopularCommodities = unstable_cache(
  async (limit = 12) =>
    db
      .select()
      .from(commodities)
      .where(and(eq(commodities.status, "active"), eq(commodities.isPopular, true)))
      .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn))
      .limit(limit),
  ["popular-commodities"],
  { tags: ["taxonomy"], revalidate: 300 },
);

export async function getVarieties(commodityId: string): Promise<VarietyRow[]> {
  return db
    .select()
    .from(commodityVarieties)
    .where(and(eq(commodityVarieties.commodityId, commodityId), eq(commodityVarieties.status, "active")))
    .orderBy(asc(commodityVarieties.sortOrder), asc(commodityVarieties.nameEn));
}

export async function getVarietyBySlug(commodityId: string, slug: string): Promise<VarietyRow | null> {
  const [row] = await db
    .select()
    .from(commodityVarieties)
    .where(and(eq(commodityVarieties.commodityId, commodityId), eq(commodityVarieties.slug, slug)))
    .limit(1);
  return row ?? null;
}

/** Grades applicable to a commodity, optionally narrowed to a variety (variety-specific + commodity-wide). */
export async function getGrades(commodityId: string, varietyId?: string | null): Promise<GradeRow[]> {
  return db
    .select()
    .from(commodityGrades)
    .where(
      and(
        eq(commodityGrades.commodityId, commodityId),
        eq(commodityGrades.status, "active"),
        varietyId ? or(isNull(commodityGrades.varietyId), eq(commodityGrades.varietyId, varietyId)) : isNull(commodityGrades.varietyId),
      ),
    )
    .orderBy(asc(commodityGrades.sortOrder), asc(commodityGrades.nameEn));
}

export const getUnits = unstable_cache(
  async (): Promise<UnitRow[]> => db.select().from(units).where(eq(units.status, "active")).orderBy(asc(units.sortOrder), asc(units.nameEn)),
  ["units"],
  { tags: ["taxonomy"], revalidate: 300 },
);

/** Units offered for a commodity: commodity-specific → category chain → all active units. */
export async function getUnitsForCommodity(commodity: CommodityRow): Promise<{ units: UnitRow[]; defaultUnitId: string | null }> {
  const all = await getUnits();
  const specific = await db.select().from(categoryUnits).where(eq(categoryUnits.commodityId, commodity.id)).orderBy(asc(categoryUnits.sortOrder));
  if (specific.length) {
    const ids = new Set(specific.map((s) => s.unitId));
    return { units: all.filter((u) => ids.has(u.id)), defaultUnitId: specific.find((s) => s.isDefault)?.unitId ?? commodity.defaultUnitId ?? specific[0].unitId };
  }
  const chain = await getCategoryAncestors(commodity.categoryId);
  for (const cat of [...chain].reverse()) {
    const catUnits = await db.select().from(categoryUnits).where(eq(categoryUnits.categoryId, cat.id)).orderBy(asc(categoryUnits.sortOrder));
    if (catUnits.length) {
      const ids = new Set(catUnits.map((s) => s.unitId));
      return { units: all.filter((u) => ids.has(u.id)), defaultUnitId: commodity.defaultUnitId ?? catUnits.find((s) => s.isDefault)?.unitId ?? cat.defaultUnitId ?? catUnits[0].unitId };
    }
  }
  return { units: all, defaultUnitId: commodity.defaultUnitId ?? all.find((u) => u.code === "kg")?.id ?? null };
}

export type ApplicableAttribute = AttributeRow & { isRequired: boolean; displayOrder: number };

/** Attributes for a commodity: commodity-specific plus inherited from the category chain. */
export async function getAttributesForCommodity(commodity: CommodityRow): Promise<ApplicableAttribute[]> {
  const chain = await getCategoryAncestors(commodity.categoryId);
  const catIds = chain.map((c) => c.id);
  const links = await db
    .select({ link: categoryAttributes, def: attributeDefinitions })
    .from(categoryAttributes)
    .innerJoin(attributeDefinitions, eq(attributeDefinitions.id, categoryAttributes.attributeId))
    .where(or(eq(categoryAttributes.commodityId, commodity.id), catIds.length ? inArray(categoryAttributes.categoryId, catIds) : sql`false`));
  const map = new Map<string, ApplicableAttribute>();
  // Category-level first, then commodity-level overrides.
  for (const l of links.filter((x) => x.link.categoryId)) map.set(l.def.id, { ...l.def, isRequired: l.link.isRequired, displayOrder: l.link.displayOrder });
  for (const l of links.filter((x) => x.link.commodityId)) map.set(l.def.id, { ...l.def, isRequired: l.link.isRequired, displayOrder: l.link.displayOrder });
  return [...map.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.nameEn.localeCompare(b.nameEn));
}

/** Effective moderation level for a commodity (commodity override → nearest category). */
export async function getModerationLevel(commodity: CommodityRow): Promise<"auto" | "review" | "restricted" | "prohibited"> {
  if (commodity.moderationLevel) return commodity.moderationLevel;
  const chain = await getCategoryAncestors(commodity.categoryId);
  for (const c of [...chain].reverse()) if (c.moderationLevel) return c.moderationLevel;
  return "review";
}

/** Convert a quantity to kilograms when the unit has a valid mass factor. */
export function toKilograms(quantity: number, unit: UnitRow | undefined | null, maundKg = 40): number | null {
  if (!unit || unit.unitType !== "mass") return null;
  if (unit.code === "maund") return quantity * maundKg;
  if (!unit.baseFactor) return null;
  const f = Number(unit.baseFactor);
  return Number.isFinite(f) && f > 0 ? quantity * f : null;
}
