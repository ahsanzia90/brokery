import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags, siteSettings } from "@/db/schema";
import { audit } from "@/lib/audit";
import { SETTING_DEFAULTS } from "@/lib/config/settings";
import { revalidateSettings } from "./cache";

export class SettingsError extends Error {}

export type SettingType = "text" | "number" | "boolean" | "json" | "textarea";
export type SettingDef = { key: string; label: string; type: SettingType; group: string; help?: string; readOnly?: boolean };

export const SETTING_GROUPS: Array<{ group: string; description?: string; keys: SettingDef[] }> = [
  {
    group: "Brand",
    description: "Brand name and tagline. Changing these does not require a redeploy.",
    keys: [
      { key: "brand.name", label: "Brand name", type: "text", group: "Brand" },
      { key: "brand.product_name", label: "Product name", type: "text", group: "Brand" },
      { key: "brand.tagline", label: "Tagline (English)", type: "text", group: "Brand" },
      { key: "brand.tagline_ur", label: "Tagline (Urdu)", type: "text", group: "Brand" },
      { key: "brand.logo_path", label: "Logo (storage path)", type: "text", group: "Brand", help: "Upload a logo below to set this automatically." },
    ],
  },
  {
    group: "Contact",
    keys: [
      { key: "contact.email", label: "Support email", type: "text", group: "Contact" },
      { key: "contact.phone", label: "Support phone", type: "text", group: "Contact" },
      { key: "contact.whatsapp", label: "Support WhatsApp", type: "text", group: "Contact" },
    ],
  },
  {
    group: "Languages",
    keys: [{ key: "languages.enabled", label: "Enabled languages", type: "json", group: "Languages", help: 'JSON array, e.g. ["en","ur"]' }],
  },
  {
    group: "Listings & moderation",
    keys: [
      { key: "listings.default_expiry_days", label: "Default listing expiry (days)", type: "number", group: "Listings & moderation" },
      { key: "listings.require_moderation", label: "Require admin review before publishing", type: "boolean", group: "Listings & moderation" },
      { key: "listings.max_images", label: "Max photos per listing", type: "number", group: "Listings & moderation" },
      { key: "moderation.auto_publish_verified_sellers", label: "Auto-publish listings from document-verified sellers", type: "boolean", group: "Listings & moderation" },
    ],
  },
  {
    group: "Prices",
    keys: [
      { key: "prices.stale_after_days", label: "Mark rates stale after (days)", type: "number", group: "Prices" },
      { key: "prices.hard_expire_days", label: "Auto-expire published rates after (days)", type: "number", group: "Prices" },
      { key: "prices.default_currency", label: "Default currency", type: "text", group: "Prices" },
    ],
  },
  {
    group: "Units",
    keys: [{ key: "units.maund_kg", label: "Maund in kilograms", type: "number", group: "Units", help: "Used to normalise maund quantities. Market definitions vary; 40 kg is common in Pakistan." }],
  },
  {
    group: "Buying requests",
    keys: [{ key: "rfq.expiry_days", label: "Buying request expiry (days)", type: "number", group: "Buying requests" }],
  },
  {
    group: "SEO",
    keys: [
      { key: "seo.default_title_suffix", label: "Default title suffix", type: "text", group: "SEO" },
      { key: "seo.default_description", label: "Default meta description", type: "textarea", group: "SEO" },
    ],
  },
  {
    group: "Analytics & limits",
    keys: [
      { key: "analytics.enabled", label: "Record product analytics events", type: "boolean", group: "Analytics & limits" },
      { key: "contact.require_login", label: "Require sign-in to reveal supplier contact details", type: "boolean", group: "Analytics & limits" },
      { key: "rate_limits.listing_create_per_day", label: "Listings per seller per day", type: "number", group: "Analytics & limits" },
      { key: "rate_limits.rfq_create_per_day", label: "Buying requests per buyer per day", type: "number", group: "Analytics & limits" },
      { key: "rate_limits.contact_clicks_per_hour", label: "Contact reveals per user per hour", type: "number", group: "Analytics & limits" },
    ],
  },
  {
    group: "Payments (future — not active)",
    description: "No payment provider is integrated. These values are stored for a future release and have no effect.",
    keys: [
      { key: "payments.enabled", label: "Payments enabled", type: "boolean", group: "Payments (future — not active)", readOnly: true },
      { key: "payments.provider", label: "Payment provider", type: "text", group: "Payments (future — not active)", readOnly: true },
    ],
  },
];

export const NOTIFICATION_TEMPLATE_TYPES: Array<{ type: string; label: string; placeholders: string[] }> = [
  { type: "listing_approved", label: "Listing approved", placeholders: ["{title}", "{link}"] },
  { type: "listing_rejected", label: "Listing rejected", placeholders: ["{title}", "{reason}"] },
  { type: "listing_edit_requested", label: "Listing edits requested", placeholders: ["{title}", "{reason}"] },
  { type: "new_rfq", label: "New buyer request", placeholders: ["{commodity}", "{quantity}", "{city}", "{reference}"] },
  { type: "quote_received", label: "Offer received", placeholders: ["{business}", "{reference}"] },
  { type: "verification_update", label: "Verification status update", placeholders: ["{status}", "{reason}"] },
  { type: "admin_request_info", label: "Admin requests more information", placeholders: ["{message}"] },
  { type: "listing_expiring", label: "Listing expiring soon", placeholders: ["{title}", "{days}"] },
];

export function parseSettingValue(def: SettingDef, raw: string | null): unknown {
  switch (def.type) {
    case "boolean":
      return raw === "on" || raw === "true";
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new SettingsError(`${def.label}: must be a number`);
      return n;
    }
    case "json":
      try {
        return JSON.parse(raw ?? "null");
      } catch {
        throw new SettingsError(`${def.label}: invalid JSON`);
      }
    default:
      return raw ?? "";
  }
}

export async function saveSettings(actorId: string, values: Record<string, unknown>) {
  const current = await db.select().from(siteSettings);
  const map = new Map(current.map((r) => [r.key, r.value]));
  let changed = 0;
  for (const [key, value] of Object.entries(values)) {
    const prev = map.has(key) ? map.get(key) : SETTING_DEFAULTS[key];
    if (JSON.stringify(prev) === JSON.stringify(value)) continue;
    await db
      .insert(siteSettings)
      .values({ key, value: value as never, updatedBy: actorId })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: value as never, updatedBy: actorId, updatedAt: new Date() } });
    await audit({ actorId, action: "settings.update", entityType: "site_setting", entityId: key, before: { value: prev as never }, after: { value: value as never } });
    changed++;
  }
  if (changed) revalidateSettings();
  return changed;
}

export const PAYMENT_FLAGS = new Set(["payments", "subscriptions", "featured_listings_paid", "premium_insights"]);

export async function saveFeatureFlag(actorId: string, key: string, input: { enabled: boolean; config?: Record<string, unknown> | null; description?: string | null }) {
  const [before] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
  if (!before) throw new SettingsError("Flag not found");
  const [row] = await db.update(featureFlags).set({ enabled: input.enabled, config: input.config ?? before.config, description: input.description ?? before.description, updatedBy: actorId }).where(eq(featureFlags.key, key)).returning();
  await audit({ actorId, action: "flags.update", entityType: "feature_flag", entityId: key, before: { enabled: before.enabled }, after: { enabled: row.enabled } });
  revalidateSettings();
  return row;
}
