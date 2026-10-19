import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_common";
import { profiles } from "./identity";

export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "sms", "email", "whatsapp"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "sent", "failed", "skipped", "read"]);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // listing_approved | new_rfq | quote_received | verification_update …
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    title: text("title").notNull(),
    body: text("body"),
    linkPath: text("link_path"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("pending"),
    deliveryError: text("delivery_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)],
);

export const contentStatusEnum = pgEnum("content_status", ["draft", "published", "archived"]);
export const contentKindEnum = pgEnum("content_kind", ["page", "article", "guide", "announcement", "faq"]);

export const contentPages = pgTable(
  "content_pages",
  {
    id: id(),
    kind: contentKindEnum("kind").notNull().default("page"),
    slug: text("slug").notNull(),
    titleEn: text("title_en").notNull(),
    titleUr: text("title_ur"),
    excerptEn: text("excerpt_en"),
    excerptUr: text("excerpt_ur"),
    bodyEn: text("body_en").notNull().default(""), // Markdown
    bodyUr: text("body_ur"),
    coverImagePath: text("cover_image_path"),
    relatedCommodityIds: uuid("related_commodity_ids").array().notNull().default([]),
    status: contentStatusEnum("status").notNull().default("draft"),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    isSystem: boolean("is_system").notNull().default(false), // privacy/terms etc. cannot be deleted
    ...timestamps,
  },
  (t) => [uniqueIndex("content_pages_slug_uq").on(t.slug), index("content_pages_kind_status_idx").on(t.kind, t.status, t.publishedAt)],
);

export const seoMetadata = pgTable(
  "seo_metadata",
  {
    id: id(),
    /** Either a path ("/commodities/rice") or an entity reference. */
    path: text("path"),
    entityType: text("entity_type"), // category | commodity | variety | business | content | location
    entityId: uuid("entity_id"),
    title: text("title"),
    description: text("description"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots"), // "index,follow" | "noindex,follow" …
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImagePath: text("og_image_path"),
    includeInSitemap: boolean("include_in_sitemap"),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("seo_metadata_path_uq").on(t.path), uniqueIndex("seo_metadata_entity_uq").on(t.entityType, t.entityId)],
);

export const redirects = pgTable(
  "redirects",
  {
    id: id(),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    isActive: boolean("is_active").notNull().default(true),
    hitCount: integer("hit_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("redirects_source_uq").on(t.sourcePath)],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g. listing.approve, price.publish, user.suspend
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    reason: text("reason"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("admin_audit_logs_entity_idx").on(t.entityType, t.entityId), index("admin_audit_logs_created_idx").on(t.createdAt)],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseTypeEnum = pgEnum("case_type", [
  "listing_report",
  "supplier_report",
  "spam",
  "misleading_price",
  "fraud",
  "prohibited_goods",
  "privacy",
  "support",
  "data_deletion",
  "other",
]);
export const caseSeverityEnum = pgEnum("case_severity", ["low", "medium", "high", "critical"]);
export const caseStatusEnum = pgEnum("case_status", ["open", "in_progress", "waiting_on_user", "resolved", "dismissed"]);

export const supportCases = pgTable(
  "support_cases",
  {
    id: id(),
    reference: text("reference").notNull(),
    caseType: caseTypeEnum("case_type").notNull(),
    severity: caseSeverityEnum("severity").notNull().default("medium"),
    status: caseStatusEnum("status").notNull().default("open"),
    reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
    reporterContact: text("reporter_contact"), // for guest submissions
    subject: text("subject").notNull(),
    description: text("description"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    notes: jsonb("notes").$type<Array<{ at: string; by: string | null; text: string }>>().notNull().default([]),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("support_cases_reference_uq").on(t.reference), index("support_cases_status_idx").on(t.status, t.severity)],
);

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  config: jsonb("config").$type<Record<string, unknown>>(),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  ...timestamps,
});

/** Privacy-conscious product analytics. No raw IPs; user IDs only when signed in. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    eventName: text("event_name").notNull(), // home_buy_click, search, zero_result_search, listing_view, contact_click, rfq_created …
    userId: uuid("user_id"),
    anonymousId: text("anonymous_id"), // random cookie id, rotated
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    path: text("path"),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("analytics_events_name_created_idx").on(t.eventName, t.createdAt), index("analytics_events_entity_idx").on(t.entityType, t.entityId)],
);

export const searchLogs = pgTable(
  "search_logs",
  {
    id: id(),
    queryText: text("query_text").notNull(),
    normalized: text("normalized").notNull(),
    resultCount: integer("result_count").notNull().default(0),
    userId: uuid("user_id"),
    anonymousId: text("anonymous_id"),
    locationId: uuid("location_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("search_logs_normalized_idx").on(t.normalized, t.createdAt)],
);

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: id(),
    key: text("key").notNull(), // hero | search | categories | prices | listings | suppliers | how_it_works | browse_categories | browse_cities | guides
    titleEn: text("title_en"),
    titleUr: text("title_ur"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [uniqueIndex("homepage_sections_key_uq").on(t.key)],
);

/** Sliding-window rate limiting persisted in the database (works across instances). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(), // e.g. otp:+9230…, listing_create:userId
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).defaultNow().notNull(),
  },
);
