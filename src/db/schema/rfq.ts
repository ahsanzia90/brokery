import {
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_common";
import { businesses, profiles } from "./identity";
import { attributeDefinitions, commodities, commodityGrades, commodityVarieties, locations, units } from "./taxonomy";
import { listings } from "./marketplace";

export const rfqStatusEnum = pgEnum("rfq_status", [
  "submitted",
  "matching",
  "responses_received",
  "in_discussion",
  "closed",
  "cancelled",
]);
export const contactPreferenceEnum = pgEnum("contact_preference", ["platform", "phone", "whatsapp", "any"]);

export const rfqs = pgTable(
  "rfqs",
  {
    id: id(),
    reference: text("reference").notNull(), // human-friendly e.g. RFQ-2026-000123
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    commodityId: uuid("commodity_id")
      .notNull()
      .references(() => commodities.id, { onDelete: "restrict" }),
    varietyId: uuid("variety_id").references(() => commodityVarieties.id, { onDelete: "set null" }),
    gradeId: uuid("grade_id").references(() => commodityGrades.id, { onDelete: "set null" }),
    customSpecification: text("custom_specification"),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }), // when started from a listing
    targetBusinessId: uuid("target_business_id").references(() => businesses.id, { onDelete: "set null" }), // direct enquiry
    quantity: numeric("quantity", { precision: 16, scale: 3 }).notNull(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    provinceId: uuid("province_id").references(() => locations.id, { onDelete: "set null" }),
    cityId: uuid("city_id").references(() => locations.id, { onDelete: "set null" }),
    marketId: uuid("market_id").references(() => locations.id, { onDelete: "set null" }),
    requiredBy: date("required_by"),
    targetPrice: numeric("target_price", { precision: 14, scale: 2 }),
    targetPriceUnitId: uuid("target_price_unit_id").references(() => units.id, { onDelete: "set null" }),
    qualityRequirements: text("quality_requirements"),
    notes: text("notes"),
    contactPreference: contactPreferenceEnum("contact_preference").notNull().default("any"),
    status: rfqStatusEnum("status").notNull().default("submitted"),
    closedReason: text("closed_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rfqs_reference_uq").on(t.reference),
    index("rfqs_buyer_idx").on(t.buyerId, t.createdAt),
    index("rfqs_commodity_status_idx").on(t.commodityId, t.status),
    index("rfqs_target_business_idx").on(t.targetBusinessId),
  ],
);

export const rfqAttributes = pgTable(
  "rfq_attributes",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: "cascade" }),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 18, scale: 6 }),
  },
  (t) => [uniqueIndex("rfq_attributes_uq").on(t.rfqId, t.attributeId)],
);

export const recipientStateEnum = pgEnum("rfq_recipient_state", ["matched", "notified", "viewed", "responded", "declined"]);

export const rfqRecipients = pgTable(
  "rfq_recipients",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    state: recipientStateEnum("state").notNull().default("matched"),
    matchReason: text("match_reason"), // direct | commodity | commodity+city
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rfq_recipients_uq").on(t.rfqId, t.businessId), index("rfq_recipients_business_idx").on(t.businessId, t.state)],
);

export const quoteStatusEnum = pgEnum("quote_status", ["sent", "viewed", "contacted", "accepted", "declined", "expired", "withdrawn"]);

export const supplierQuotes = pgTable(
  "supplier_quotes",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    respondedBy: uuid("responded_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    priceAmount: numeric("price_amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("PKR"),
    priceUnitId: uuid("price_unit_id").references(() => units.id, { onDelete: "set null" }),
    quantity: numeric("quantity", { precision: 16, scale: 3 }),
    quantityUnitId: uuid("quantity_unit_id").references(() => units.id, { onDelete: "set null" }),
    validUntil: date("valid_until"),
    deliveryTerms: text("delivery_terms"),
    notes: text("notes"),
    status: quoteStatusEnum("status").notNull().default("sent"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("supplier_quotes_rfq_business_uq").on(t.rfqId, t.businessId),
    index("supplier_quotes_business_idx").on(t.businessId),
  ],
);

export const enquiryEvents = pgTable(
  "enquiry_events",
  {
    id: id(),
    rfqId: uuid("rfq_id")
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id").references(() => supplierQuotes.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(), // submitted | matched | quote_sent | quote_viewed | contact_clicked | status_changed | closed …
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("enquiry_events_rfq_idx").on(t.rfqId, t.createdAt)],
);
