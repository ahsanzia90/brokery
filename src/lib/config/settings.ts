import "server-only";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { cached } from "@/lib/cache";
import { BRAND_DEFAULTS, type Brand } from "./brand";

export type SettingsMap = Record<string, unknown>;

export const SETTING_DEFAULTS: SettingsMap = {
  "brand.name": BRAND_DEFAULTS.name,
  "brand.product_name": BRAND_DEFAULTS.productName,
  "brand.tagline": BRAND_DEFAULTS.tagline,
  "brand.tagline_ur": BRAND_DEFAULTS.taglineUr,
  "brand.logo_path": null,
  "contact.email": "",
  "contact.phone": "",
  "contact.whatsapp": "",
  "languages.enabled": ["en", "ur"],
  "listings.default_expiry_days": 30,
  "listings.require_moderation": true,
  "listings.max_images": 6,
  "prices.stale_after_days": 7,
  "prices.default_currency": "PKR",
  "units.maund_kg": 40,
  "rfq.expiry_days": 14,
  "moderation.auto_publish_verified_sellers": false,
  "payments.enabled": false,
  "payments.provider": "none",
  "seo.default_title_suffix": " | MandiLink",
  "seo.default_description":
    "Find commodities, check published market rates and contact suppliers across Pakistan. Free B2B marketplace for buyers and sellers.",
  "analytics.enabled": true,
  "ui.photos_enabled": false,
  "rate_limits.listing_create_per_day": 20,
  "rate_limits.rfq_create_per_day": 20,
  "rate_limits.contact_clicks_per_hour": 60,
};

async function loadSettingsUncached(): Promise<SettingsMap> {
  const rows = await db.select().from(siteSettings);
  const map: SettingsMap = { ...SETTING_DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export const getSettings = cached(loadSettingsUncached, ["site-settings"], {
  tags: ["settings"],
  revalidate: 60,
});

export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T> {
  const s = await getSettings();
  const v = s[key];
  return (v === undefined || v === null ? fallback : v) as T;
}

export async function getBrand(): Promise<Brand> {
  const s = await getSettings();
  return {
    name: String(s["brand.name"] ?? BRAND_DEFAULTS.name),
    productName: String(s["brand.product_name"] ?? BRAND_DEFAULTS.productName),
    tagline: String(s["brand.tagline"] ?? BRAND_DEFAULTS.tagline),
    taglineUr: String(s["brand.tagline_ur"] ?? BRAND_DEFAULTS.taglineUr),
    siteUrl: BRAND_DEFAULTS.siteUrl,
    currency: String(s["prices.default_currency"] ?? "PKR"),
    currencyPrefix: BRAND_DEFAULTS.currencyPrefix,
    contactEmail: String(s["contact.email"] ?? ""),
    contactPhone: String(s["contact.phone"] ?? ""),
    contactWhatsapp: String(s["contact.whatsapp"] ?? ""),
    logoPath: (s["brand.logo_path"] as string | null) ?? null,
  };
}
