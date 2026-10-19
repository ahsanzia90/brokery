import type { MetadataRoute } from "next";
import { BRAND_DEFAULTS } from "@/lib/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/rfq/new"],
        disallow: ["/admin", "/dashboard", "/account", "/login", "/onboarding", "/favorites", "/notifications", "/rfq/", "/files/private", "/api", "/search?", "/*?page=", "/*?sort=", "/forbidden"],
      },
    ],
    sitemap: `${BRAND_DEFAULTS.siteUrl}/sitemap.xml`,
    host: BRAND_DEFAULTS.siteUrl,
  };
}
