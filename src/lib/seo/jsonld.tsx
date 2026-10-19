import { BRAND_DEFAULTS } from "@/lib/config/brand";

/** Render JSON-LD safely. Only call with data that genuinely qualifies — never fabricated ratings/reviews. */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function organizationJsonLd(brand: { name: string; logoPath?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: BRAND_DEFAULTS.siteUrl,
    ...(brand.logoPath ? { logo: `${BRAND_DEFAULTS.siteUrl}/files/public/${brand.logoPath}` } : {}),
  };
}

export function websiteJsonLd(brandName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName,
    url: BRAND_DEFAULTS.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BRAND_DEFAULTS.siteUrl}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${BRAND_DEFAULTS.siteUrl}${it.path}`,
    })),
  };
}

export function articleJsonLd(a: { title: string; description?: string | null; path: string; publishedAt?: Date | string | null; updatedAt?: Date | string | null; image?: string | null; authorName?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    ...(a.description ? { description: a.description } : {}),
    mainEntityOfPage: `${BRAND_DEFAULTS.siteUrl}${a.path}`,
    ...(a.publishedAt ? { datePublished: new Date(a.publishedAt).toISOString() } : {}),
    ...(a.updatedAt ? { dateModified: new Date(a.updatedAt).toISOString() } : {}),
    ...(a.image ? { image: [a.image.startsWith("http") ? a.image : `${BRAND_DEFAULTS.siteUrl}${a.image}`] } : {}),
    author: { "@type": "Organization", name: a.authorName ?? BRAND_DEFAULTS.name },
    publisher: { "@type": "Organization", name: BRAND_DEFAULTS.name },
  };
}
