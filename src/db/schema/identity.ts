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
import { locations } from "./taxonomy";

export const languageEnum = pgEnum("language", ["en", "ur"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "deactivated", "deleted"]);
export const roleEnum = pgEnum("role", [
  "buyer",
  "seller",
  "super_admin",
  "taxonomy_manager",
  "price_editor",
  "listing_moderator",
  "verification_reviewer",
  "content_editor",
  "support_agent",
]);

/** A user account. Phone number is the login identifier (OTP-based). */
export const profiles = pgTable(
  "profiles",
  {
    id: id(),
    phone: text("phone").notNull(), // E.164, e.g. +923001234567
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    email: text("email"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    name: text("name").notNull().default(""),
    language: languageEnum("language").notNull().default("en"),
    cityId: uuid("city_id").references(() => locations.id, { onDelete: "set null" }),
    status: accountStatusEnum("status").notNull().default("active"),
    statusReason: text("status_reason"),
    isBuyer: boolean("is_buyer").notNull().default(true),
    isSeller: boolean("is_seller").notNull().default(false),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("profiles_phone_uq").on(t.phone), index("profiles_email_idx").on(t.email)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    assignedBy: uuid("assigned_by").references(() => profiles.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_roles_user_role_uq").on(t.userId, t.role), index("user_roles_role_idx").on(t.role)],
);

/** Server-side sessions. The cookie only carries an opaque random token hash. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const otpPurposeEnum = pgEnum("otp_purpose", ["login", "phone_change", "account_recovery"]);

/** One-time codes. Only an HMAC of the code is stored; never the code itself. */
export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: id(),
    phone: text("phone").notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("login"),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    deliveryProvider: text("delivery_provider").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("pending"), // pending | sent | failed
    deliveryError: text("delivery_error"),
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("otp_phone_created_idx").on(t.phone, t.createdAt)],
);

export const businessTypeEnum = pgEnum("business_type", [
  "trader",
  "wholesaler",
  "manufacturer",
  "farmer",
  "importer",
  "exporter",
  "distributor",
  "broker",
  "mill",
  "other",
]);
export const businessStatusEnum = pgEnum("business_status", ["active", "suspended", "closed"]);
export const verificationLevelEnum = pgEnum("verification_level", [
  "none",
  "phone_verified",
  "documents_reviewed",
  "admin_verified",
]);

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    businessType: businessTypeEnum("business_type").notNull().default("trader"),
    description: text("description"),
    contactPersonName: text("contact_person_name"),
    addressLine: text("address_line"),
    provinceId: uuid("province_id").references(() => locations.id, { onDelete: "set null" }),
    cityId: uuid("city_id").references(() => locations.id, { onDelete: "set null" }),
    marketId: uuid("market_id").references(() => locations.id, { onDelete: "set null" }),
    publicPhone: text("public_phone"),
    whatsappNumber: text("whatsapp_number"),
    showPhonePublicly: boolean("show_phone_publicly").notNull().default(false),
    showWhatsappPublicly: boolean("show_whatsapp_publicly").notNull().default(false),
    showAddressPublicly: boolean("show_address_publicly").notNull().default(false),
    website: text("website"),
    yearsInBusiness: integer("years_in_business"),
    registrationNumber: text("registration_number"), // NTN/STRN/other, private by default
    languages: text("languages").array().notNull().default([]),
    logoPath: text("logo_path"),
    verificationLevel: verificationLevelEnum("verification_level").notNull().default("none"),
    status: businessStatusEnum("status").notNull().default("active"),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("businesses_slug_uq").on(t.slug),
    index("businesses_owner_idx").on(t.ownerId),
    index("businesses_city_idx").on(t.cityId),
    index("businesses_verification_idx").on(t.verificationLevel),
  ],
);

export const businessMemberRoleEnum = pgEnum("business_member_role", ["owner", "manager", "staff"]);

export const businessMembers = pgTable(
  "business_members",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: businessMemberRoleEnum("role").notNull().default("staff"),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [uniqueIndex("business_members_uq").on(t.businessId, t.userId)],
);

/** Commodities a business declares it supplies (independent of live listings). */
export const businessCommodities = pgTable(
  "business_commodities",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    commodityId: uuid("commodity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("business_commodities_uq").on(t.businessId, t.commodityId), index("business_commodities_commodity_idx").on(t.commodityId)],
);

export const verificationStatusEnum = pgEnum("verification_status", [
  "submitted",
  "under_review",
  "more_info_requested",
  "approved",
  "rejected",
]);

export const businessVerifications = pgTable(
  "business_verifications",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    requestedLevel: verificationLevelEnum("requested_level").notNull().default("documents_reviewed"),
    status: verificationStatusEnum("status").notNull().default("submitted"),
    submittedBy: uuid("submitted_by").references(() => profiles.id, { onDelete: "set null" }),
    applicantNotes: text("applicant_notes"),
    reviewerId: uuid("reviewer_id").references(() => profiles.id, { onDelete: "set null" }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("business_verifications_business_idx").on(t.businessId), index("business_verifications_status_idx").on(t.status)],
);

export const documentTypeEnum = pgEnum("document_type", [
  "cnic",
  "ntn",
  "strn",
  "business_registration",
  "trade_license",
  "utility_bill",
  "bank_letter",
  "other",
]);

/** Private documents. Stored in the private bucket; never publicly readable. */
export const businessDocuments = pgTable(
  "business_documents",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    verificationId: uuid("verification_id").references(() => businessVerifications.id, { onDelete: "set null" }),
    documentType: documentTypeEnum("document_type").notNull(),
    storagePath: text("storage_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("business_documents_business_idx").on(t.businessId)],
);

export const consentTypeEnum = pgEnum("consent_type", [
  "terms",
  "privacy",
  "contact_sharing",
  "marketing",
  "analytics",
]);

export const userConsents = pgTable(
  "user_consents",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    version: text("version").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [index("user_consents_user_idx").on(t.userId, t.consentType)],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  inApp: boolean("in_app").notNull().default(true),
  sms: boolean("sms").notNull().default(true),
  email: boolean("email").notNull().default(false),
  whatsapp: boolean("whatsapp").notNull().default(false),
  rfqAlerts: boolean("rfq_alerts").notNull().default(true),
  listingUpdates: boolean("listing_updates").notNull().default(true),
  ...timestamps,
});
