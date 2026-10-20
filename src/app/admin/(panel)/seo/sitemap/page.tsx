import Link from "next/link";
import { and, count, countDistinct, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, commodities, contentPages, listings, locations, marketPrices, seoMetadata } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { AdminPageHeader, Table, Td, Th } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";

export default async function SitemapInspectionPage() {
  await requireAdminPage("seo.manage");
  const n = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0;
  const rows = [
    { section: "Static pages", rule: "Home, /categories, /listings, /prices, /suppliers, /markets, /guides", count: 7 },
    { section: "Categories", rule: "status = active", count: await n(db.select({ n: count() }).from(categories).where(eq(categories.status, "active"))) },
    { section: "Commodities", rule: "status = active", count: await n(db.select({ n: count() }).from(commodities).where(eq(commodities.status, "active"))) },
    { section: "Listings", rule: "status = published", count: await n(db.select({ n: count() }).from(listings).where(eq(listings.status, "published"))) },
    { section: "Supplier profiles", rule: "business status = active", count: await n(db.select({ n: count() }).from(businesses).where(eq(businesses.status, "active"))) },
    { section: "City supplier pages", rule: "cities with ≥1 active supplier", count: await n(db.select({ n: countDistinct(businesses.cityId) }).from(businesses).where(eq(businesses.status, "active"))) },
    { section: "Commodity price pages", rule: "commodities with ≥1 published price", count: await n(db.select({ n: countDistinct(marketPrices.commodityId) }).from(marketPrices).where(eq(marketPrices.status, "published"))) },
    { section: "Commodity + city pages", rule: "pairs with ≥1 published listing (else noindex)", count: await n(db.select({ n: countDistinct(listings.cityId) }).from(listings).where(eq(listings.status, "published"))) },
    { section: "Guides & articles", rule: "published", count: await n(db.select({ n: count() }).from(contentPages).where(and(inArray(contentPages.kind, ["guide", "article"]), eq(contentPages.status, "published")))) },
    { section: "Content pages", rule: "published", count: await n(db.select({ n: count() }).from(contentPages).where(and(eq(contentPages.kind, "page"), eq(contentPages.status, "published")))) },
    { section: "Market/location pages", rule: "active cities & markets (noindex when empty)", count: await n(db.select({ n: count() }).from(locations).where(and(eq(locations.status, "active"), inArray(locations.type, ["city", "market"])))) },
  ];
  const excluded = await db.select().from(seoMetadata).where(eq(seoMetadata.includeInSitemap, false));
  const noindex = await db.select().from(seoMetadata).where(inArray(seoMetadata.robots, ["noindex,follow", "noindex,nofollow"]));
  return (
    <div>
      <AdminPageHeader title="Sitemap inspection" description="What the public sitemap includes, by rule. Variety and commodity+city pages are only indexed when they have meaningful inventory or price data." breadcrumbs={[{ label: "SEO", href: "/admin/seo" }, { label: "Sitemap" }]} />
      <Alert tone="info" className="mb-4">
        Live sitemap: <a href={`${BRAND_DEFAULTS.siteUrl}/sitemap.xml`} target="_blank" className="underline font-latin">{BRAND_DEFAULTS.siteUrl}/sitemap.xml</a> · robots: <a href={`${BRAND_DEFAULTS.siteUrl}/robots.txt`} target="_blank" className="underline font-latin">/robots.txt</a>. Private areas (admin, dashboards, accounts, enquiries) are never included.
      </Alert>
      <Table>
        <thead><tr><Th>Section</Th><Th>Inclusion rule</Th><Th>Eligible count</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.section}><Td>{r.section}</Td><Td className="text-sm text-muted">{r.rule}</Td><Td className="num">{r.count}</Td></tr>
          ))}
        </tbody>
      </Table>
      <h2 className="adm-section">Manual exclusions</h2>
      {excluded.length === 0 && noindex.length === 0 && <p className="text-sm text-muted">No pages are manually excluded from the sitemap or marked noindex.</p>}
      <ul className="space-y-1 text-sm">
        {excluded.map((e) => (
          <li key={e.id}><Link href={`/admin/seo/${e.id}`} className="adm-link">{e.path ?? `${e.entityType} ${e.entityId}`}</Link> — excluded from sitemap</li>
        ))}
        {noindex.map((e) => (
          <li key={`n-${e.id}`}><Link href={`/admin/seo/${e.id}`} className="adm-link">{e.path ?? `${e.entityType} ${e.entityId}`}</Link> — {e.robots}</li>
        ))}
      </ul>
    </div>
  );
}
