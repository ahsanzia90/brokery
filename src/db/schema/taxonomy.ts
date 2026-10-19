import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_common";

export const taxonomyStatusEnum = pgEnum("taxonomy_status", ["active", "inactive", "merged"]);
export const listingKindEnum = pgEnum("listing_kind", [
  "commodity",
  "agricultural_input",
  "industrial_material",
  "equipment",
  "livestock",
  "other",
]);
export const moderationLevelEnum = pgEnum("moderation_level", [
  "auto", // publish immediately
  "review", // admin review before publish
  "restricted", // requires documents + admin review (chemicals, fuels, crop protection…)
  "prohibited", // cannot be listed
]);

/** Hierarchical categories: main category → subcategory (any depth). */
export const categories = pgTable(
  "categories",
  {
    id: id(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    aliasesRoman: text("aliases_roman").array().notNull().default([]),
    description: text("description"),
    descriptionUr: text("description_ur"),
    imagePath: text("image_path"),
    icon: text("icon"), // emoji or icon key; always paired with a text label in UI
    listingKind: listingKindEnum("listing_kind").notNull().default("commodity"),
    moderationLevel: moderationLevelEnum("moderation_level").notNull().default("review"),
    supportsGrades: boolean("supports_grades").notNull().default(true),
    supportsPriceBenchmark: boolean("supports_price_benchmark").notNull().default(true),
    defaultUnitId: uuid("default_unit_id").references((): AnyPgColumn => units.id, { onDelete: "set null" }),
    status: taxonomyStatusEnum("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_slug_uq").on(t.slug),
    index("categories_parent_idx").on(t.parentId),
    index("categories_status_sort_idx").on(t.status, t.sortOrder),
  ],
);

export const commodities = pgTable(
  "commodities",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    description: text("description"),
    descriptionUr: text("description_ur"),
    imagePath: text("image_path"),
    listingKind: listingKindEnum("listing_kind"), // null → inherit from category
    moderationLevel: moderationLevelEnum("moderation_level"), // null → inherit
    supportsVarieties: boolean("supports_varieties").notNull().default(true),
    supportsGrades: boolean("supports_grades").notNull().default(true),
    supportsPriceBenchmark: boolean("supports_price_benchmark").notNull().default(true),
    defaultUnitId: uuid("default_unit_id").references((): AnyPgColumn => units.id, { onDelete: "set null" }),
    status: taxonomyStatusEnum("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => commodities.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPopular: boolean("is_popular").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("commodities_slug_uq").on(t.slug),
    index("commodities_category_idx").on(t.categoryId),
    index("commodities_status_idx").on(t.status),
  ],
);

export const aliasLanguageEnum = pgEnum("alias_language", ["en", "ur", "ur_roman", "other"]);

/** Search aliases: local names, spellings, regional trade terms ("Zero 9"). */
export const commodityAliases = pgTable(
  "commodity_aliases",
  {
    id: id(),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "cascade" }),
    varietyId: uuid("variety_id").references((): AnyPgColumn => commodityVarieties.id, { onDelete: "cascade" }),
    language: aliasLanguageEnum("language").notNull().default("ur_roman"),
    alias: text("alias").notNull(),
    normalized: text("normalized").notNull(), // lowercased, diacritics stripped, single-spaced
    region: text("region"), // optional: where this term is used
    isApproved: boolean("is_approved").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("commodity_aliases_commodity_idx").on(t.commodityId),
    index("commodity_aliases_normalized_idx").on(t.normalized),
  ],
);

export const commodityVarieties = pgTable(
  "commodity_varieties",
  {
    id: id(),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    aliasesRoman: text("aliases_roman").array().notNull().default([]),
    description: text("description"),
    status: taxonomyStatusEnum("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("commodity_varieties_uq").on(t.commodityId, t.slug),
    index("commodity_varieties_commodity_idx").on(t.commodityId),
  ],
);

/** Grades / specifications. Attach to a commodity (all varieties) or a specific variety. */
export const commodityGrades = pgTable(
  "commodity_grades",
  {
    id: id(),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "cascade" }),
    varietyId: uuid("variety_id").references(() => commodityVarieties.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    description: text("description"),
    status: taxonomyStatusEnum("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("commodity_grades_uq").on(t.commodityId, t.slug),
    index("commodity_grades_commodity_idx").on(t.commodityId),
  ],
);

export const attributeTypeEnum = pgEnum("attribute_type", ["text", "number", "select", "multiselect", "boolean", "date"]);

/** Reusable attribute definitions (broken %, moisture %, GSM, thickness…). */
export const attributeDefinitions = pgTable(
  "attribute_definitions",
  {
    id: id(),
    key: text("key").notNull(), // e.g. broken_percent
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    type: attributeTypeEnum("type").notNull().default("text"),
    unitLabel: text("unit_label"), // display suffix e.g. "%", "mm", "GSM"
    allowedValues: text("allowed_values").array(), // for select/multiselect
    minValue: numeric("min_value"),
    maxValue: numeric("max_value"),
    isFilterable: boolean("is_filterable").notNull().default(false),
    helpText: text("help_text"),
    ...timestamps,
  },
  (t) => [uniqueIndex("attribute_definitions_key_uq").on(t.key)],
);

/** Which attributes apply to a category (inherited by subcategories/commodities) or a commodity. */
export const categoryAttributes = pgTable(
  "category_attributes",
  {
    id: id(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    commodityId: uuid("commodity_id").references(() => commodities.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [
    index("category_attributes_category_idx").on(t.categoryId),
    index("category_attributes_commodity_idx").on(t.commodityId),
  ],
);

export const unitTypeEnum = pgEnum("unit_type", ["mass", "volume", "count", "length", "area", "package"]);

/**
 * Units. `baseFactor` converts to the base unit of the type (kg, litre, piece, metre, m²).
 * It is NULL for packages with no fixed weight (bag, carton, drum) — those quantities are
 * stored as entered and never normalized.
 */
export const units = pgTable(
  "units",
  {
    id: id(),
    code: text("code").notNull(), // kg, mt, maund, bag40, piece…
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    symbol: text("symbol").notNull(),
    unitType: unitTypeEnum("unit_type").notNull(),
    baseFactor: numeric("base_factor", { precision: 18, scale: 6 }), // e.g. maund → 40 kg
    conversionNote: text("conversion_note"), // e.g. "Maund = 40 kg in most Pakistani markets; configurable"
    applicableKinds: text("applicable_kinds").array().notNull().default([]), // empty = all
    status: taxonomyStatusEnum("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("units_code_uq").on(t.code)],
);

/** Which units are offered for a category/commodity in listing & RFQ forms. */
export const categoryUnits = pgTable(
  "category_units",
  {
    id: id(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    commodityId: uuid("commodity_id").references(() => commodities.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("category_units_category_idx").on(t.categoryId), index("category_units_commodity_idx").on(t.commodityId)],
);

export const locationTypeEnum = pgEnum("location_type", ["country", "province", "district", "city", "market"]);

export const locations = pgTable(
  "locations",
  {
    id: id(),
    parentId: uuid("parent_id").references((): AnyPgColumn => locations.id, { onDelete: "set null" }),
    type: locationTypeEnum("type").notNull(),
    slug: text("slug").notNull(), // unique per type, e.g. "lahore"
    path: text("path").notNull(), // e.g. "punjab/lahore" (province/city) used for /markets/... URLs
    nameEn: text("name_en").notNull(),
    nameUr: text("name_ur"),
    aliasesRoman: text("aliases_roman").array().notNull().default([]),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    isMajorMarket: boolean("is_major_market").notNull().default(false),
    status: taxonomyStatusEnum("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("locations_type_slug_uq").on(t.type, t.slug),
    uniqueIndex("locations_path_uq").on(t.path),
    index("locations_parent_idx").on(t.parentId),
    index("locations_type_idx").on(t.type),
  ],
);

export const taxonomyRequestStatusEnum = pgEnum("taxonomy_request_status", ["pending", "approved", "rejected", "merged"]);

/** "Not listed" requests from sellers/buyers for new commodities, varieties or aliases. */
export const taxonomyRequests = pgTable(
  "taxonomy_requests",
  {
    id: id(),
    requestedBy: uuid("requested_by"),
    requestType: text("request_type").notNull(), // commodity | variety | grade | alias | category
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    commodityId: uuid("commodity_id").references(() => commodities.id, { onDelete: "set null" }),
    proposedName: text("proposed_name").notNull(),
    proposedNameUr: text("proposed_name_ur"),
    notes: text("notes"),
    region: text("region"),
    status: taxonomyRequestStatusEnum("status").notNull().default("pending"),
    resolvedEntityId: uuid("resolved_entity_id"),
    reviewerId: uuid("reviewer_id"),
    reviewNotes: text("review_notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("taxonomy_requests_status_idx").on(t.status)],
);
