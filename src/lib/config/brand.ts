/**
 * Brand configuration. Defaults come from environment variables and can be
 * overridden from Admin → Settings (site_settings table) without redeploying.
 */
export const BRAND_DEFAULTS = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "MandiLink",
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Pakistan Commodity Market",
  tagline: "Know the market. Find the supplier. Make the deal.",
  taglineUr: "مارکیٹ جانیں۔ سپلائر تلاش کریں۔ سودا کریں۔",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  currency: "PKR",
  currencyPrefix: "Rs.",
  country: "Pakistan",
  phoneCountryCode: "+92",
} as const;

export type Brand = {
  name: string;
  productName: string;
  tagline: string;
  taglineUr: string;
  siteUrl: string;
  currency: string;
  currencyPrefix: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  logoPath: string | null;
};
