import "server-only";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { seoMetadata } from "@/db/schema";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { getSettings } from "@/lib/config/settings";

export type SeoInput = {
  /** Path starting with "/" — used for canonical + admin overrides lookup. */
  path: string;
  title: string;
  description: string;
  /** Entity override lookup (category/commodity/business/content/location). */
  entity?: { type: string; id: string };
  noindex?: boolean;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
};

export async function getSeoOverride(input: { path?: string; entity?: { type: string; id: string } }) {
  if (input.entity) {
    const [row] = await db
      .select()
      .from(seoMetadata)
      .where(and(eq(seoMetadata.entityType, input.entity.type), eq(seoMetadata.entityId, input.entity.id)))
      .limit(1);
    if (row) return row;
  }
  if (input.path) {
    const [row] = await db.select().from(seoMetadata).where(eq(seoMetadata.path, input.path)).limit(1);
    if (row) return row;
  }
  return null;
}

/** Build Next.js metadata with admin overrides, canonical URL, OG and robots. */
export async function buildMetadata(input: SeoInput): Promise<Metadata> {
  const settings = await getSettings();
  const brand = String(settings["brand.name"] ?? BRAND_DEFAULTS.name);
  const suffix = String(settings["seo.default_title_suffix"] ?? ` | ${brand}`);
  const override = await getSeoOverride({ path: input.path, entity: input.entity });

  const rawTitle = override?.title || input.title;
  const title = rawTitle.includes(brand) ? rawTitle : `${rawTitle}${suffix}`;
  const description = override?.description || input.description;
  const canonical = override?.canonicalUrl || `${BRAND_DEFAULTS.siteUrl}${input.path}`;
  const robotsDirective = override?.robots || (input.noindex ? "noindex,follow" : "index,follow");
  const noindex = robotsDirective.includes("noindex");
  const ogImage = override?.ogImagePath ? `${BRAND_DEFAULTS.siteUrl}/files/public/${override.ogImagePath}` : input.image ? (input.image.startsWith("http") ? input.image : `${BRAND_DEFAULTS.siteUrl}${input.image}`) : `${BRAND_DEFAULTS.siteUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !noindex, follow: true },
    openGraph: {
      title: override?.ogTitle || title,
      description: override?.ogDescription || description,
      url: canonical,
      siteName: brand,
      type: input.type ?? "website",
      locale: "en_PK",
      images: [{ url: ogImage }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: override?.ogTitle || title, description: override?.ogDescription || description },
  };
}

export const NOINDEX: Metadata = { robots: { index: false, follow: false } };
