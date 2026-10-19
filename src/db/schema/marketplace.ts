import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id, timestamps, tsvector } from "./_common";
import { businesses, profiles } from "./identity";
import { attributeDefinitions, commodities, commodityGrades, commodityVarieties, locations, units } from "./taxonomy";

export const priceTypeEnum = pgEnum("listing_price_type", ["fixed", "negotiable", "quote", "on_contact"]);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "paused",
  "expired",
  "sold_out",
  "removed",
]);
export const availabilityEnum = pgEnum("availability", ["available", "temporarily_unavailable", "sold_out"]);
export const deliveryOptionEnum = pgEnum("delivery_option", ["yes", "no", "ask"]);
export const conditionEnum = pgEnum("product_condition", ["new", "used", "refurbished", "fresh", "stored", "not_applicable"]);

export const listings = pgTable(
  "listings",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "restrict" }),
    varietyId: uuid("variety_id").references(() => commodityVarieties.id, { onDelete: "set null" }),
    gradeId: uuid("grade_id").references(() => commodityGrades.id, { onDelete: "set null" }),
    customVariety: text("custom_variety"), // seller-entered when "Not listed"
    customGrade: text("custom_grade"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priceType: priceTypeEnum("price_type").notNull().default("quote"),
    priceAmount: numeric("price_amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("PKR"),
    priceUnitId: uuid("price_unit_id").references(() => units.id, { onDelete: "set null" }),
    quantity: numeric("quantity", { precision: 16, scale: 3 }).notNull(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    quantityKg: numeric("quantity_kg", { precision: 18, scale: 3 }), // only when unit conversion is valid
    minOrderQuantity: numeric("min_order_quantity", { precision: 16, scale: 3 }),
    minOrderUnitId: uuid("min_order_unit_id").references(() => units.id, { onDelete: "set null" }),
    provinceId: uuid("province_id").references(() => locations.id, { onDelete: "set null" }),
    districtId: uuid("district_id").references(() => locations.id, { onDelete: "set null" }),
    cityId: uuid("city_id").references(() => locations.id, { onDelete: "set null" }),
    marketId: uuid("market_id").references(() => locations.id, { onDelete: "set null" }),
    pickupLocation: text("pickup_location"),
    deliveryAvailable: deliveryOptionEnum("delivery_available").notNull().default("ask"),
    condition: conditionEnum("condition").notNull().default("not_applicable"),
    packaging: text("packaging"),
    availableFrom: date("available_from"),
    availability: availabilityEnum("availability").notNull().default("available"),
    status: listingStatusEnum("status").notNull().default("draft"),
    statusReason: text("status_reason"),
    moderatedBy: uuid("moderated_by").references(() => profiles.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }).defaultNow().notNull(),
    contactPhoneEnabled: boolean("contact_phone_enabled").notNull().default(true),
    contactWhatsappEnabled: boolean("contact_whatsapp_enabled").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    contactClickCount: integer("contact_click_count").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'C') || setweight(to_tsvector('simple', coalesce(custom_variety, '') || ' ' || coalesce(custom_grade, '') || ' ' || coalesce(packaging, '')), 'B')`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("listings_slug_uq").on(t.slug),
    index("listings_business_idx").on(t.businessId),
    index("listings_commodity_status_idx").on(t.commodityId, t.status),
    index("listings_city_idx").on(t.cityId),
    index("listings_status_published_idx").on(t.status, t.publishedAt),
    index("listings_expires_idx").on(t.expiresAt),
    index("listings_search_idx").using("gin", t.searchVector),
  ],
);

export const listingAttributes = pgTable(
  "listing_attributes",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: "cascade" }),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 18, scale: 6 }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date"),
  },
  (t) => [
    uniqueIndex("listing_attributes_uq").on(t.listingId, t.attributeId),
    index("listing_attributes_attr_number_idx").on(t.attributeId, t.valueNumber),
    index("listing_attributes_attr_text_idx").on(t.attributeId, t.valueText),
  ],
);

export const imageModerationEnum = pgEnum("image_moderation", ["pending", "approved", "rejected"]);

export const listingImages = pgTable(
  "listing_images",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    altText: text("alt_text"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    sortOrder: integer("sort_order").notNull().default(0),
    moderationStatus: imageModerationEnum("moderation_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("listing_images_listing_idx").on(t.listingId, t.sortOrder)],
);

export const listingStatusHistory = pgTable(
  "listing_status_history",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    previousStatus: listingStatusEnum("previous_status"),
    newStatus: listingStatusEnum("new_status").notNull(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("listing_status_history_listing_idx").on(t.listingId, t.createdAt)],
);

export const listingDocuments = pgTable(
  "listing_documents",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // "Lab test report", "Safety data sheet"
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("listing_documents_listing_idx").on(t.listingId)],
);

/* Favorites: separate tables keep foreign keys unambiguous. */
export const favoriteListings = pgTable(
  "favorite_listings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("favorite_listings_uq").on(t.userId, t.listingId)],
);

export const favoriteBusinesses = pgTable(
  "favorite_businesses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("favorite_businesses_uq").on(t.userId, t.businessId)],
);

export const favoriteCommodities = pgTable(
  "favorite_commodities",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("favorite_commodities_uq").on(t.userId, t.commodityId)],
);

export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "misleading_price",
  "fraud",
  "prohibited_goods",
  "privacy",
  "duplicate",
  "wrong_category",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "under_review", "resolved", "dismissed"]);

export const listingReports = pgTable(
  "listing_reports",
  {
    id: id(),
    reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("open"),
    reviewerId: uuid("reviewer_id").references(() => profiles.id, { onDelete: "set null" }),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("listing_reports_status_idx").on(t.status), index("listing_reports_listing_idx").on(t.listingId)],
);
