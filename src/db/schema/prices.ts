import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_common";
import { profiles } from "./identity";
import { commodities, commodityGrades, commodityVarieties, locations, units } from "./taxonomy";

export const priceSourceTypeEnum = pgEnum("price_source_type", [
  "market_committee",
  "government",
  "exchange",
  "trade_association",
  "supplier",
  "buyer_report",
  "platform_survey",
  "other",
]);

export const priceSources = pgTable("price_sources", {
  id: id(),
  name: text("name").notNull(),
  sourceType: priceSourceTypeEnum("source_type").notNull().default("other"),
  url: text("url"),
  reference: text("reference"),
  isActive: integer("is_active").notNull().default(1),
  ...timestamps,
});

export const marketPriceTypeEnum = pgEnum("market_price_type", [
  "indicative", // indicative market rate
  "supplier_offer", // verified supplier offer
  "buyer_reported", // buyer-reported rate
  "official_reference", // official / published reference rate
]);
export const marketPriceStatusEnum = pgEnum("market_price_status", [
  "draft",
  "pending_review",
  "published",
  "expired",
  "rejected",
  "superseded",
]);

export const marketPrices = pgTable(
  "market_prices",
  {
    id: id(),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "restrict" }),
    varietyId: uuid("variety_id").references(() => commodityVarieties.id, { onDelete: "set null" }),
    gradeId: uuid("grade_id").references(() => commodityGrades.id, { onDelete: "set null" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("PKR"),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    priceType: marketPriceTypeEnum("price_type").notNull().default("indicative"),
    lowAmount: numeric("low_amount", { precision: 14, scale: 2 }),
    highAmount: numeric("high_amount", { precision: 14, scale: 2 }),
    previousPriceId: uuid("previous_price_id"),
    previousAmount: numeric("previous_amount", { precision: 14, scale: 2 }),
    changePercent: numeric("change_percent", { precision: 8, scale: 2 }),
    observationDate: date("observation_date").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    sourceId: uuid("source_id").references(() => priceSources.id, { onDelete: "set null" }),
    sourceReference: text("source_reference"),
    notes: text("notes"),
    status: marketPriceStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewerId: uuid("reviewer_id").references(() => profiles.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    importJobId: uuid("import_job_id"),
    ...timestamps,
  },
  (t) => [
    index("market_prices_lookup_idx").on(t.commodityId, t.locationId, t.status, t.observationDate),
    index("market_prices_status_obs_idx").on(t.status, t.observationDate),
    index("market_prices_location_idx").on(t.locationId),
  ],
);

/** Immutable audit history of every change to a price record. */
export const priceHistory = pgTable(
  "price_history",
  {
    id: id(),
    priceId: uuid("price_id")
      .notNull()
      .references(() => marketPrices.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    action: text("action").notNull(), // created | updated | published | expired | corrected | rejected
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changedFields: text("changed_fields").array().notNull().default([]),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("price_history_price_idx").on(t.priceId, t.version)],
);

export const importJobStatusEnum = pgEnum("import_job_status", ["pending", "processing", "completed", "failed", "partial"]);

export const priceImportJobs = pgTable("price_import_jobs", {
  id: id(),
  filename: text("filename").notNull(),
  status: importJobStatusEnum("status").notNull().default("pending"),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  errors: jsonb("errors").$type<Array<{ row: number; message: string }>>().notNull().default([]),
  actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  ...timestamps,
});
