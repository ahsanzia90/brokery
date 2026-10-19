CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deactivated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."business_member_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('trader', 'wholesaler', 'manufacturer', 'farmer', 'importer', 'exporter', 'distributor', 'broker', 'mill', 'other');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy', 'contact_sharing', 'marketing', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('cnic', 'ntn', 'strn', 'business_registration', 'trade_license', 'utility_bill', 'bank_letter', 'other');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'ur');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('login', 'phone_change', 'account_recovery');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('buyer', 'seller', 'super_admin', 'taxonomy_manager', 'price_editor', 'listing_moderator', 'verification_reviewer', 'content_editor', 'support_agent');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('none', 'phone_verified', 'documents_reviewed', 'admin_verified');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('submitted', 'under_review', 'more_info_requested', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."alias_language" AS ENUM('en', 'ur', 'ur_roman', 'other');--> statement-breakpoint
CREATE TYPE "public"."attribute_type" AS ENUM('text', 'number', 'select', 'multiselect', 'boolean', 'date');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('commodity', 'agricultural_input', 'industrial_material', 'equipment', 'livestock', 'other');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('country', 'province', 'district', 'city', 'market');--> statement-breakpoint
CREATE TYPE "public"."moderation_level" AS ENUM('auto', 'review', 'restricted', 'prohibited');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_request_status" AS ENUM('pending', 'approved', 'rejected', 'merged');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_status" AS ENUM('active', 'inactive', 'merged');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('mass', 'volume', 'count', 'length', 'area', 'package');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('available', 'temporarily_unavailable', 'sold_out');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('new', 'used', 'refurbished', 'fresh', 'stored', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."delivery_option" AS ENUM('yes', 'no', 'ask');--> statement-breakpoint
CREATE TYPE "public"."image_moderation" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'paused', 'expired', 'sold_out', 'removed');--> statement-breakpoint
CREATE TYPE "public"."listing_price_type" AS ENUM('fixed', 'negotiable', 'quote', 'on_contact');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'misleading_price', 'fraud', 'prohibited_goods', 'privacy', 'duplicate', 'wrong_category', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'under_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."market_price_status" AS ENUM('draft', 'pending_review', 'published', 'expired', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."market_price_type" AS ENUM('indicative', 'supplier_offer', 'buyer_reported', 'official_reference');--> statement-breakpoint
CREATE TYPE "public"."price_source_type" AS ENUM('market_committee', 'government', 'exchange', 'trade_association', 'supplier', 'buyer_report', 'platform_survey', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_preference" AS ENUM('platform', 'phone', 'whatsapp', 'any');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('sent', 'viewed', 'contacted', 'accepted', 'declined', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."rfq_recipient_state" AS ENUM('matched', 'notified', 'viewed', 'responded', 'declined');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('submitted', 'matching', 'responses_received', 'in_discussion', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."case_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('open', 'in_progress', 'waiting_on_user', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('listing_report', 'supplier_report', 'spam', 'misleading_price', 'fraud', 'prohibited_goods', 'privacy', 'support', 'data_deletion', 'other');--> statement-breakpoint
CREATE TYPE "public"."content_kind" AS ENUM('page', 'article', 'guide', 'announcement', 'faq');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'skipped', 'read');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'sms', 'email', 'whatsapp');--> statement-breakpoint
CREATE TABLE "business_commodities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"verification_id" uuid,
	"document_type" "document_type" NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" uuid,
	"retention_until" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "business_member_role" DEFAULT 'staff' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"requested_level" "verification_level" DEFAULT 'documents_reviewed' NOT NULL,
	"status" "verification_status" DEFAULT 'submitted' NOT NULL,
	"submitted_by" uuid,
	"applicant_notes" text,
	"reviewer_id" uuid,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"business_type" "business_type" DEFAULT 'trader' NOT NULL,
	"description" text,
	"contact_person_name" text,
	"address_line" text,
	"province_id" uuid,
	"city_id" uuid,
	"market_id" uuid,
	"public_phone" text,
	"whatsapp_number" text,
	"show_phone_publicly" boolean DEFAULT false NOT NULL,
	"show_whatsapp_publicly" boolean DEFAULT false NOT NULL,
	"show_address_publicly" boolean DEFAULT false NOT NULL,
	"website" text,
	"years_in_business" integer,
	"registration_number" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"logo_path" text,
	"verification_level" "verification_level" DEFAULT 'none' NOT NULL,
	"status" "business_status" DEFAULT 'active' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"sms" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"whatsapp" boolean DEFAULT false NOT NULL,
	"rfq_alerts" boolean DEFAULT true NOT NULL,
	"listing_updates" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"purpose" "otp_purpose" DEFAULT 'login' NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"delivery_provider" text NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"delivery_error" text,
	"ip_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"email" text,
	"email_verified_at" timestamp with time zone,
	"name" text DEFAULT '' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"city_id" uuid,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"is_buyer" boolean DEFAULT true NOT NULL,
	"is_seller" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attribute_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"type" "attribute_type" DEFAULT 'text' NOT NULL,
	"unit_label" text,
	"allowed_values" text[],
	"min_value" numeric,
	"max_value" numeric,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"help_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"aliases_roman" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"description_ur" text,
	"image_path" text,
	"icon" text,
	"listing_kind" "listing_kind" DEFAULT 'commodity' NOT NULL,
	"moderation_level" "moderation_level" DEFAULT 'review' NOT NULL,
	"supports_grades" boolean DEFAULT true NOT NULL,
	"supports_price_benchmark" boolean DEFAULT true NOT NULL,
	"default_unit_id" uuid,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"commodity_id" uuid,
	"attribute_id" uuid NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"commodity_id" uuid,
	"unit_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commodities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"description" text,
	"description_ur" text,
	"image_path" text,
	"listing_kind" "listing_kind",
	"moderation_level" "moderation_level",
	"supports_varieties" boolean DEFAULT true NOT NULL,
	"supports_grades" boolean DEFAULT true NOT NULL,
	"supports_price_benchmark" boolean DEFAULT true NOT NULL,
	"default_unit_id" uuid,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commodity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety_id" uuid,
	"language" "alias_language" DEFAULT 'ur_roman' NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL,
	"region" text,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commodity_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety_id" uuid,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"description" text,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commodity_varieties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"aliases_roman" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"type" "location_type" NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"aliases_roman" text[] DEFAULT '{}' NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_major_market" boolean DEFAULT false NOT NULL,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid,
	"request_type" text NOT NULL,
	"category_id" uuid,
	"commodity_id" uuid,
	"proposed_name" text NOT NULL,
	"proposed_name_ur" text,
	"notes" text,
	"region" text,
	"status" "taxonomy_request_status" DEFAULT 'pending' NOT NULL,
	"resolved_entity_id" uuid,
	"reviewer_id" uuid,
	"review_notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ur" text,
	"symbol" text NOT NULL,
	"unit_type" "unit_type" NOT NULL,
	"base_factor" numeric(18, 6),
	"conversion_note" text,
	"applicable_kinds" text[] DEFAULT '{}' NOT NULL,
	"status" "taxonomy_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_businesses" (
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_commodities" (
	"user_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_listings" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value_text" text,
	"value_number" numeric(18, 6),
	"value_boolean" boolean,
	"value_date" date
);
--> statement-breakpoint
CREATE TABLE "listing_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"label" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"alt_text" text,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"moderation_status" "image_moderation" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"listing_id" uuid,
	"business_id" uuid,
	"reason" "report_reason" NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"reviewer_id" uuid,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"previous_status" "listing_status",
	"new_status" "listing_status" NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety_id" uuid,
	"grade_id" uuid,
	"custom_variety" text,
	"custom_grade" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price_type" "listing_price_type" DEFAULT 'quote' NOT NULL,
	"price_amount" numeric(14, 2),
	"currency" text DEFAULT 'PKR' NOT NULL,
	"price_unit_id" uuid,
	"quantity" numeric(16, 3) NOT NULL,
	"unit_id" uuid NOT NULL,
	"quantity_kg" numeric(18, 3),
	"min_order_quantity" numeric(16, 3),
	"min_order_unit_id" uuid,
	"province_id" uuid,
	"district_id" uuid,
	"city_id" uuid,
	"market_id" uuid,
	"pickup_location" text,
	"delivery_available" "delivery_option" DEFAULT 'ask' NOT NULL,
	"condition" "product_condition" DEFAULT 'not_applicable' NOT NULL,
	"packaging" text,
	"available_from" date,
	"availability" "availability" DEFAULT 'available' NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"status_reason" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_phone_enabled" boolean DEFAULT true NOT NULL,
	"contact_whatsapp_enabled" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"contact_click_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'C') || setweight(to_tsvector('simple', coalesce(custom_variety, '') || ' ' || coalesce(custom_grade, '') || ' ' || coalesce(packaging, '')), 'B')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety_id" uuid,
	"grade_id" uuid,
	"location_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"unit_id" uuid NOT NULL,
	"price_type" "market_price_type" DEFAULT 'indicative' NOT NULL,
	"low_amount" numeric(14, 2),
	"high_amount" numeric(14, 2),
	"previous_price_id" uuid,
	"previous_amount" numeric(14, 2),
	"change_percent" numeric(8, 2),
	"observation_date" date NOT NULL,
	"published_at" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"source_id" uuid,
	"source_reference" text,
	"notes" text,
	"status" "market_price_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"import_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_fields" text[] DEFAULT '{}' NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source_type" "price_source_type" DEFAULT 'other' NOT NULL,
	"url" text,
	"reference" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"quote_id" uuid,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value_text" text,
	"value_number" numeric(18, 6)
);
--> statement-breakpoint
CREATE TABLE "rfq_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"state" "rfq_recipient_state" DEFAULT 'matched' NOT NULL,
	"match_reason" text,
	"notified_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"buyer_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety_id" uuid,
	"grade_id" uuid,
	"custom_specification" text,
	"listing_id" uuid,
	"target_business_id" uuid,
	"quantity" numeric(16, 3) NOT NULL,
	"unit_id" uuid NOT NULL,
	"province_id" uuid,
	"city_id" uuid,
	"market_id" uuid,
	"required_by" date,
	"target_price" numeric(14, 2),
	"target_price_unit_id" uuid,
	"quality_requirements" text,
	"notes" text,
	"contact_preference" "contact_preference" DEFAULT 'any' NOT NULL,
	"status" "rfq_status" DEFAULT 'submitted' NOT NULL,
	"closed_reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"responded_by" uuid NOT NULL,
	"price_amount" numeric(14, 2),
	"currency" text DEFAULT 'PKR' NOT NULL,
	"price_unit_id" uuid,
	"quantity" numeric(16, 3),
	"quantity_unit_id" uuid,
	"valid_until" date,
	"delivery_terms" text,
	"notes" text,
	"status" "quote_status" DEFAULT 'sent' NOT NULL,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"entity_type" text,
	"entity_id" uuid,
	"properties" jsonb,
	"path" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "content_kind" DEFAULT 'page' NOT NULL,
	"slug" text NOT NULL,
	"title_en" text NOT NULL,
	"title_ur" text,
	"excerpt_en" text,
	"excerpt_ur" text,
	"body_en" text DEFAULT '' NOT NULL,
	"body_ur" text,
	"cover_image_path" text,
	"related_commodity_ids" uuid[] DEFAULT '{}' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"author_id" uuid,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"config" jsonb,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title_en" text,
	"title_ur" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_path" text,
	"entity_type" text,
	"entity_id" uuid,
	"delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"delivery_error" text,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"destination_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text NOT NULL,
	"normalized" text NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text,
	"entity_type" text,
	"entity_id" uuid,
	"title" text,
	"description" text,
	"canonical_url" text,
	"robots" text,
	"og_title" text,
	"og_description" text,
	"og_image_path" text,
	"include_in_sitemap" boolean,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"case_type" "case_type" NOT NULL,
	"severity" "case_severity" DEFAULT 'medium' NOT NULL,
	"status" "case_status" DEFAULT 'open' NOT NULL,
	"reporter_id" uuid,
	"reporter_contact" text,
	"subject" text NOT NULL,
	"description" text,
	"entity_type" text,
	"entity_id" uuid,
	"assigned_to" uuid,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_commodities" ADD CONSTRAINT "business_commodities_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_verification_id_business_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."business_verifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_submitted_by_profiles_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_province_id_locations_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_market_id_locations_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_default_unit_id_units_id_fk" FOREIGN KEY ("default_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_merged_into_id_categories_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_attribute_id_attribute_definitions_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_units" ADD CONSTRAINT "category_units_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_units" ADD CONSTRAINT "category_units_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_units" ADD CONSTRAINT "category_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_default_unit_id_units_id_fk" FOREIGN KEY ("default_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_merged_into_id_commodities_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."commodities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_aliases" ADD CONSTRAINT "commodity_aliases_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_aliases" ADD CONSTRAINT "commodity_aliases_variety_id_commodity_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."commodity_varieties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_grades" ADD CONSTRAINT "commodity_grades_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_grades" ADD CONSTRAINT "commodity_grades_variety_id_commodity_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."commodity_varieties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodity_varieties" ADD CONSTRAINT "commodity_varieties_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_requests" ADD CONSTRAINT "taxonomy_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_requests" ADD CONSTRAINT "taxonomy_requests_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_businesses" ADD CONSTRAINT "favorite_businesses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_businesses" ADD CONSTRAINT "favorite_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_commodities" ADD CONSTRAINT "favorite_commodities_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_commodities" ADD CONSTRAINT "favorite_commodities_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_listings" ADD CONSTRAINT "favorite_listings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_listings" ADD CONSTRAINT "favorite_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_attribute_id_attribute_definitions_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_documents" ADD CONSTRAINT "listing_documents_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_variety_id_commodity_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."commodity_varieties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_grade_id_commodity_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."commodity_grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_price_unit_id_units_id_fk" FOREIGN KEY ("price_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_min_order_unit_id_units_id_fk" FOREIGN KEY ("min_order_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_province_id_locations_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_locations_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_market_id_locations_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_moderated_by_profiles_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_variety_id_commodity_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."commodity_varieties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_grade_id_commodity_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."commodity_grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_source_id_price_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."price_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_price_id_market_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."market_prices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_import_jobs" ADD CONSTRAINT "price_import_jobs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_quote_id_supplier_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."supplier_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_attributes" ADD CONSTRAINT "rfq_attributes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_attributes" ADD CONSTRAINT "rfq_attributes_attribute_id_attribute_definitions_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_recipients" ADD CONSTRAINT "rfq_recipients_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_recipients" ADD CONSTRAINT "rfq_recipients_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_id_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_variety_id_commodity_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."commodity_varieties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_grade_id_commodity_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."commodity_grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_target_business_id_businesses_id_fk" FOREIGN KEY ("target_business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_province_id_locations_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_city_id_locations_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_market_id_locations_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_target_price_unit_id_units_id_fk" FOREIGN KEY ("target_price_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_responded_by_profiles_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_price_unit_id_units_id_fk" FOREIGN KEY ("price_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_quantity_unit_id_units_id_fk" FOREIGN KEY ("quantity_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pages" ADD CONSTRAINT "content_pages_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_commodities_uq" ON "business_commodities" USING btree ("business_id","commodity_id");--> statement-breakpoint
CREATE INDEX "business_commodities_commodity_idx" ON "business_commodities" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "business_documents_business_idx" ON "business_documents" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_uq" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_verifications_business_idx" ON "business_verifications" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_verifications_status_idx" ON "business_verifications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_uq" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_owner_idx" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "businesses_city_idx" ON "businesses" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "businesses_verification_idx" ON "businesses" USING btree ("verification_level");--> statement-breakpoint
CREATE INDEX "otp_phone_created_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_phone_uq" ON "profiles" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_consents_user_idx" ON "user_consents" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_uq" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_definitions_key_uq" ON "attribute_definitions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_status_sort_idx" ON "categories" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "category_attributes_category_idx" ON "category_attributes" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "category_attributes_commodity_idx" ON "category_attributes" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "category_units_category_idx" ON "category_units" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "category_units_commodity_idx" ON "category_units" USING btree ("commodity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commodities_slug_uq" ON "commodities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "commodities_category_idx" ON "commodities" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "commodities_status_idx" ON "commodities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commodity_aliases_commodity_idx" ON "commodity_aliases" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "commodity_aliases_normalized_idx" ON "commodity_aliases" USING btree ("normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "commodity_grades_uq" ON "commodity_grades" USING btree ("commodity_id","slug");--> statement-breakpoint
CREATE INDEX "commodity_grades_commodity_idx" ON "commodity_grades" USING btree ("commodity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commodity_varieties_uq" ON "commodity_varieties" USING btree ("commodity_id","slug");--> statement-breakpoint
CREATE INDEX "commodity_varieties_commodity_idx" ON "commodity_varieties" USING btree ("commodity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_type_slug_uq" ON "locations" USING btree ("type","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_path_uq" ON "locations" USING btree ("path");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "locations_type_idx" ON "locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "taxonomy_requests_status_idx" ON "taxonomy_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "units_code_uq" ON "units" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_businesses_uq" ON "favorite_businesses" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_commodities_uq" ON "favorite_commodities" USING btree ("user_id","commodity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_listings_uq" ON "favorite_listings" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_attributes_uq" ON "listing_attributes" USING btree ("listing_id","attribute_id");--> statement-breakpoint
CREATE INDEX "listing_attributes_attr_number_idx" ON "listing_attributes" USING btree ("attribute_id","value_number");--> statement-breakpoint
CREATE INDEX "listing_attributes_attr_text_idx" ON "listing_attributes" USING btree ("attribute_id","value_text");--> statement-breakpoint
CREATE INDEX "listing_documents_listing_idx" ON "listing_documents" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_images_listing_idx" ON "listing_images" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE INDEX "listing_reports_status_idx" ON "listing_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_reports_listing_idx" ON "listing_reports" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_status_history_listing_idx" ON "listing_status_history" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_uq" ON "listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listings_business_idx" ON "listings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "listings_commodity_status_idx" ON "listings" USING btree ("commodity_id","status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_status_published_idx" ON "listings" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "listings_expires_idx" ON "listings" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "listings_search_idx" ON "listings" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "market_prices_lookup_idx" ON "market_prices" USING btree ("commodity_id","location_id","status","observation_date");--> statement-breakpoint
CREATE INDEX "market_prices_status_obs_idx" ON "market_prices" USING btree ("status","observation_date");--> statement-breakpoint
CREATE INDEX "market_prices_location_idx" ON "market_prices" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "price_history_price_idx" ON "price_history" USING btree ("price_id","version");--> statement-breakpoint
CREATE INDEX "enquiry_events_rfq_idx" ON "enquiry_events" USING btree ("rfq_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_attributes_uq" ON "rfq_attributes" USING btree ("rfq_id","attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_recipients_uq" ON "rfq_recipients" USING btree ("rfq_id","business_id");--> statement-breakpoint
CREATE INDEX "rfq_recipients_business_idx" ON "rfq_recipients" USING btree ("business_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "rfqs_reference_uq" ON "rfqs" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "rfqs_buyer_idx" ON "rfqs" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "rfqs_commodity_status_idx" ON "rfqs" USING btree ("commodity_id","status");--> statement-breakpoint
CREATE INDEX "rfqs_target_business_idx" ON "rfqs" USING btree ("target_business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_quotes_rfq_business_uq" ON "supplier_quotes" USING btree ("rfq_id","business_id");--> statement-breakpoint
CREATE INDEX "supplier_quotes_business_idx" ON "supplier_quotes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_entity_idx" ON "analytics_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_pages_slug_uq" ON "content_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_pages_kind_status_idx" ON "content_pages" USING btree ("kind","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_sections_key_uq" ON "homepage_sections" USING btree ("key");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_source_uq" ON "redirects" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "search_logs_normalized_idx" ON "search_logs" USING btree ("normalized","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_path_uq" ON "seo_metadata" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_entity_uq" ON "seo_metadata" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_cases_reference_uq" ON "support_cases" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "support_cases_status_idx" ON "support_cases" USING btree ("status","severity");