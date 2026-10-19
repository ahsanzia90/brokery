/* eslint-disable no-console */
import "./env";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool, schema } from "../index";
import type { Tx } from "../index";
import { ATTRIBUTE_SEED } from "./attributes";
import { CONTENT_SEED, FEATURE_FLAGS_SEED, HOMEPAGE_SECTIONS_SEED, SITE_SETTINGS_SEED } from "./content";
import { LOCATION_SEED } from "./locations";
import { normalizeText } from "./normalize";
import { TAXONOMY_SEED, type SeedCategory, type SeedCommodity } from "./taxonomy";
import { UNIT_SEED } from "./units";

type Counts = Record<string, number>;

async function seedUnits(tx: Tx): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const u of UNIT_SEED) {
    const [row] = await tx
      .insert(schema.units)
      .values({
        code: u.code,
        nameEn: u.nameEn,
        nameUr: u.nameUr,
        symbol: u.symbol,
        unitType: u.unitType,
        baseFactor: u.baseFactor ?? null,
        conversionNote: u.conversionNote ?? null,
        applicableKinds: u.applicableKinds ?? [],
        sortOrder: u.sortOrder,
      })
      .onConflictDoUpdate({
        target: schema.units.code,
        set: {
          nameEn: u.nameEn,
          nameUr: u.nameUr,
          symbol: u.symbol,
          unitType: u.unitType,
          baseFactor: u.baseFactor ?? null,
          conversionNote: u.conversionNote ?? null,
          applicableKinds: u.applicableKinds ?? [],
          sortOrder: u.sortOrder,
        },
      })
      .returning({ id: schema.units.id });
    map.set(u.code, row.id);
  }
  return map;
}

async function seedAttributes(tx: Tx): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const a of ATTRIBUTE_SEED) {
    const values = {
      key: a.key,
      nameEn: a.nameEn,
      nameUr: a.nameUr,
      type: a.type,
      unitLabel: a.unitLabel ?? null,
      allowedValues: a.allowedValues ?? null,
      minValue: a.minValue ?? null,
      maxValue: a.maxValue ?? null,
      isFilterable: a.isFilterable ?? false,
      helpText: a.helpText ?? null,
    };
    const [row] = await tx
      .insert(schema.attributeDefinitions)
      .values(values)
      .onConflictDoUpdate({ target: schema.attributeDefinitions.key, set: { ...values, key: undefined } })
      .returning({ id: schema.attributeDefinitions.id });
    map.set(a.key, row.id);
  }
  return map;
}

async function seedLocations(tx: Tx): Promise<number> {
  const idBySlug = new Map<string, { id: string; path: string }>();
  let count = 0;
  // LOCATION_SEED is ordered parents-first.
  for (const [i, loc] of LOCATION_SEED.entries()) {
    const parent = loc.parentSlug ? idBySlug.get(loc.parentSlug) : undefined;
    if (loc.parentSlug && !parent) throw new Error(`Location parent not found: ${loc.parentSlug}`);
    // Paths: province → "punjab"; district → "punjab/lahore-district"; city → "punjab/lahore";
    // market → "punjab/lahore/akbari-mandi". Cities skip the district segment so /markets/ URLs stay short.
    let path: string;
    if (loc.type === "country" || loc.type === "province") path = loc.slug;
    else if (loc.type === "city") {
      const provincePath = parent!.path.split("/")[0];
      path = `${provincePath}/${loc.slug}`;
    } else path = `${parent!.path}/${loc.slug}`;
    const values = {
      parentId: parent?.id ?? null,
      type: loc.type,
      slug: loc.slug,
      path,
      nameEn: loc.nameEn,
      nameUr: loc.nameUr ?? null,
      aliasesRoman: loc.aliasesRoman ?? [],
      isMajorMarket: loc.isMajorMarket ?? false,
      sortOrder: i,
    };
    const [row] = await tx
      .insert(schema.locations)
      .values(values)
      .onConflictDoUpdate({ target: [schema.locations.type, schema.locations.slug], set: values })
      .returning({ id: schema.locations.id });
    idBySlug.set(loc.slug, { id: row.id, path });
    count++;
  }
  return count;
}

type TaxCtx = {
  tx: Tx;
  units: Map<string, string>;
  attrs: Map<string, string>;
  counts: Counts;
  seededCategoryIds: string[];
  seededCommodityIds: string[];
};

function bump(counts: Counts, key: string, n = 1) {
  counts[key] = (counts[key] ?? 0) + n;
}

async function upsertAlias(ctx: TaxCtx, commodityId: string, varietyId: string | null, alias: string, language: "en" | "ur" | "ur_roman", region?: string) {
  const normalized = normalizeText(alias);
  if (!normalized) return;
  const existing = await ctx.tx
    .select({ id: schema.commodityAliases.id })
    .from(schema.commodityAliases)
    .where(and(eq(schema.commodityAliases.commodityId, commodityId), eq(schema.commodityAliases.normalized, normalized), varietyId ? eq(schema.commodityAliases.varietyId, varietyId) : sql`${schema.commodityAliases.varietyId} is null`))
    .limit(1);
  if (existing.length) return;
  await ctx.tx.insert(schema.commodityAliases).values({ commodityId, varietyId, alias, language, normalized, region: region ?? null, isApproved: true });
  bump(ctx.counts, "aliases");
}

async function linkAttributes(ctx: TaxCtx, target: { categoryId?: string; commodityId?: string }, keys: string[] | undefined) {
  if (!keys) return;
  const where = target.categoryId ? eq(schema.categoryAttributes.categoryId, target.categoryId) : eq(schema.categoryAttributes.commodityId, target.commodityId!);
  await ctx.tx.delete(schema.categoryAttributes).where(where);
  for (const [i, key] of keys.entries()) {
    const attributeId = ctx.attrs.get(key);
    if (!attributeId) throw new Error(`Unknown attribute key in seed: ${key}`);
    await ctx.tx.insert(schema.categoryAttributes).values({ categoryId: target.categoryId ?? null, commodityId: target.commodityId ?? null, attributeId, isRequired: false, displayOrder: i });
    bump(ctx.counts, "category_attributes");
  }
}

async function linkUnits(ctx: TaxCtx, target: { categoryId?: string; commodityId?: string }, codes: string[] | undefined) {
  if (!codes) return;
  const where = target.categoryId ? eq(schema.categoryUnits.categoryId, target.categoryId) : eq(schema.categoryUnits.commodityId, target.commodityId!);
  await ctx.tx.delete(schema.categoryUnits).where(where);
  for (const [i, code] of codes.entries()) {
    const unitId = ctx.units.get(code);
    if (!unitId) throw new Error(`Unknown unit code in seed: ${code}`);
    await ctx.tx.insert(schema.categoryUnits).values({ categoryId: target.categoryId ?? null, commodityId: target.commodityId ?? null, unitId, isDefault: i === 0, sortOrder: i });
    bump(ctx.counts, "category_units");
  }
}

async function seedCommodity(ctx: TaxCtx, categoryId: string, com: SeedCommodity, sortOrder: number) {
  const values = {
    categoryId,
    slug: com.slug,
    nameEn: com.nameEn,
    nameUr: com.nameUr ?? null,
    description: com.description ?? null,
    moderationLevel: com.moderationLevel ?? null,
    supportsVarieties: true,
    supportsGrades: true,
    supportsPriceBenchmark: com.supportsPriceBenchmark ?? true,
    defaultUnitId: com.units?.[0] ? (ctx.units.get(com.units[0]) ?? null) : null,
    sortOrder,
    isPopular: com.isPopular ?? false,
  };
  const [row] = await ctx.tx
    .insert(schema.commodities)
    .values(values)
    .onConflictDoUpdate({ target: schema.commodities.slug, set: { ...values, slug: undefined } })
    .returning({ id: schema.commodities.id });
  bump(ctx.counts, "commodities");
  ctx.seededCommodityIds.push(row.id);

  // Aliases: explicit + Urdu name + English name
  await upsertAlias(ctx, row.id, null, com.nameEn, "en");
  if (com.nameUr) await upsertAlias(ctx, row.id, null, com.nameUr, "ur");
  for (const a of com.aliases ?? []) await upsertAlias(ctx, row.id, null, a.alias, a.language, a.region);

  for (const [vi, variety] of (com.varieties ?? []).entries()) {
    const vv = { commodityId: row.id, slug: variety.slug, nameEn: variety.nameEn, nameUr: variety.nameUr ?? null, aliasesRoman: variety.aliasesRoman ?? [], sortOrder: vi };
    const [vrow] = await ctx.tx
      .insert(schema.commodityVarieties)
      .values(vv)
      .onConflictDoUpdate({ target: [schema.commodityVarieties.commodityId, schema.commodityVarieties.slug], set: { ...vv, slug: undefined, commodityId: undefined } })
      .returning({ id: schema.commodityVarieties.id });
    bump(ctx.counts, "varieties");
    await upsertAlias(ctx, row.id, vrow.id, variety.nameEn, "en");
    if (variety.nameUr) await upsertAlias(ctx, row.id, vrow.id, variety.nameUr, "ur");
    for (const a of variety.aliasesRoman ?? []) await upsertAlias(ctx, row.id, vrow.id, a, "ur_roman");
    for (const [gi, grade] of (variety.grades ?? []).entries()) {
      const gv = { commodityId: row.id, varietyId: vrow.id, slug: `${variety.slug}-${grade.slug}`, nameEn: grade.nameEn, nameUr: grade.nameUr ?? null, description: grade.description ?? null, sortOrder: gi };
      await ctx.tx
        .insert(schema.commodityGrades)
        .values(gv)
        .onConflictDoUpdate({ target: [schema.commodityGrades.commodityId, schema.commodityGrades.slug], set: { ...gv, slug: undefined, commodityId: undefined } });
      bump(ctx.counts, "grades");
    }
  }
  for (const [gi, grade] of (com.grades ?? []).entries()) {
    const gv = { commodityId: row.id, varietyId: null, slug: grade.slug, nameEn: grade.nameEn, nameUr: grade.nameUr ?? null, description: grade.description ?? null, sortOrder: gi };
    await ctx.tx
      .insert(schema.commodityGrades)
      .values(gv)
      .onConflictDoUpdate({ target: [schema.commodityGrades.commodityId, schema.commodityGrades.slug], set: { ...gv, slug: undefined, commodityId: undefined } });
    bump(ctx.counts, "grades");
  }
  await linkAttributes(ctx, { commodityId: row.id }, com.attributes);
  await linkUnits(ctx, { commodityId: row.id }, com.units);
}

async function seedCategory(ctx: TaxCtx, cat: SeedCategory, parentId: string | null, sortOrder: number) {
  const values = {
    parentId,
    slug: cat.slug,
    nameEn: cat.nameEn,
    nameUr: cat.nameUr ?? null,
    aliasesRoman: cat.aliasesRoman ?? [],
    description: cat.description ?? null,
    icon: cat.icon ?? null,
    listingKind: cat.listingKind ?? "commodity",
    moderationLevel: cat.moderationLevel ?? "review",
    supportsGrades: cat.supportsGrades ?? true,
    supportsPriceBenchmark: cat.supportsPriceBenchmark ?? true,
    defaultUnitId: cat.units?.[0] ? (ctx.units.get(cat.units[0]) ?? null) : null,
    sortOrder,
    isFeatured: cat.isFeatured ?? false,
  };
  const [row] = await ctx.tx
    .insert(schema.categories)
    .values(values)
    .onConflictDoUpdate({ target: schema.categories.slug, set: { ...values, slug: undefined } })
    .returning({ id: schema.categories.id });
  bump(ctx.counts, "categories");
  ctx.seededCategoryIds.push(row.id);
  await linkAttributes(ctx, { categoryId: row.id }, cat.attributes);
  await linkUnits(ctx, { categoryId: row.id }, cat.units);
  for (const [i, child] of (cat.children ?? []).entries()) await seedCategory(ctx, child, row.id, i);
  for (const [i, com] of (cat.commodities ?? []).entries()) await seedCommodity(ctx, row.id, com, i);
}

async function seedTaxonomy(tx: Tx, units: Map<string, string>, attrs: Map<string, string>): Promise<Counts> {
  const ctx: TaxCtx = { tx, units, attrs, counts: {}, seededCategoryIds: [], seededCommodityIds: [] };
  for (const [i, cat] of TAXONOMY_SEED.entries()) await seedCategory(ctx, cat, null, i);
  return ctx.counts;
}

async function seedContent(tx: Tx): Promise<Counts> {
  const counts: Counts = {};
  const allSlugs = CONTENT_SEED.flatMap((p) => p.relatedCommoditySlugs ?? []);
  const comRows = allSlugs.length ? await tx.select({ id: schema.commodities.id, slug: schema.commodities.slug }).from(schema.commodities).where(inArray(schema.commodities.slug, allSlugs)) : [];
  const comBySlug = new Map(comRows.map((r) => [r.slug, r.id]));

  for (const page of CONTENT_SEED) {
    const inserted = await tx
      .insert(schema.contentPages)
      .values({
        kind: page.kind,
        slug: page.slug,
        titleEn: page.titleEn,
        titleUr: page.titleUr ?? null,
        excerptEn: page.excerptEn ?? null,
        bodyEn: page.bodyEn,
        bodyUr: page.bodyUr ?? null,
        relatedCommodityIds: (page.relatedCommoditySlugs ?? []).map((s) => comBySlug.get(s)).filter((x): x is string => Boolean(x)),
        status: page.status,
        isSystem: page.isSystem ?? false,
        publishedAt: page.status === "published" ? new Date() : null,
      })
      .onConflictDoNothing({ target: schema.contentPages.slug })
      .returning({ id: schema.contentPages.id });
    if (inserted.length) bump(counts, "content_pages");
  }
  for (const s of SITE_SETTINGS_SEED) {
    const r = await tx.insert(schema.siteSettings).values({ key: s.key, value: s.value, description: s.description }).onConflictDoNothing({ target: schema.siteSettings.key }).returning({ key: schema.siteSettings.key });
    if (r.length) bump(counts, "site_settings");
  }
  for (const f of FEATURE_FLAGS_SEED) {
    const r = await tx.insert(schema.featureFlags).values({ key: f.key, enabled: f.enabled, description: f.description }).onConflictDoNothing({ target: schema.featureFlags.key }).returning({ key: schema.featureFlags.key });
    if (r.length) bump(counts, "feature_flags");
  }
  for (const h of HOMEPAGE_SECTIONS_SEED) {
    const r = await tx
      .insert(schema.homepageSections)
      .values({ key: h.key, titleEn: h.titleEn, titleUr: h.titleUr ?? null, isEnabled: h.isEnabled, sortOrder: h.sortOrder })
      .onConflictDoNothing({ target: schema.homepageSections.key })
      .returning({ id: schema.homepageSections.id });
    if (r.length) bump(counts, "homepage_sections");
  }
  return counts;
}

export async function runSeed(): Promise<void> {
  console.log("Seeding reference data (units, attributes, locations, taxonomy, content)…");

  const { units, attrs } = await db.transaction(async (tx) => {
    const units = await seedUnits(tx);
    const attrs = await seedAttributes(tx);
    return { units, attrs };
  });
  console.log(`  units: ${units.size}, attributes: ${attrs.size}`);

  const locCount = await db.transaction((tx) => seedLocations(tx));
  console.log(`  locations: ${locCount}`);

  const taxCounts = await db.transaction((tx) => seedTaxonomy(tx, units, attrs));
  console.log(`  taxonomy: ${JSON.stringify(taxCounts)}`);

  const contentCounts = await db.transaction((tx) => seedContent(tx));
  console.log(`  content (new rows only): ${JSON.stringify(contentCounts)}`);

  console.log("Seed complete.");
}

const isDirect = process.argv[1]?.endsWith("run.ts") || process.argv[1]?.endsWith("run.js");
if (isDirect) {
  runSeed()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
