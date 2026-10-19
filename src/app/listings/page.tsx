import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { searchListings } from "@/lib/data/listings";
import { getCategoryBySlug, getCommodityBySlug, getCategoryTree } from "@/lib/data/taxonomy";
import { getCities, getMajorCities } from "@/lib/data/locations";
import { lname, pageHref, parseListingFilters, s, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import Link from "next/link";

type Props = { searchParams: Promise<SP> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).some((k) => k !== "page");
  return buildMetadata({ path: "/listings", title: "Commodity Listings from Suppliers in Pakistan", description: "Browse published commodity listings from suppliers across Pakistan. Filter by commodity, city, price and verification status.", noindex: hasFilters });
}

export default async function ListingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [category, commodity] = await Promise.all([s(sp, "category") ? getCategoryBySlug(s(sp, "category")) : null, s(sp, "commodity") ? getCommodityBySlug(s(sp, "commodity")) : null]);
  const { params, values } = parseListingFilters(sp, { categoryId: category?.id ?? null, commodityId: commodity?.id ?? null, pageSize: 18 });
  const [result, cities, major, tree] = await Promise.all([searchListings(params, locale), getCities(), getMajorCities(), getCategoryTree()]);
  const cityOptions = [...major, ...cities.filter((c) => !c.isMajorMarket)].map((c) => ({ value: c.id, label: lname(locale, c) }));
  const hidden = { category: s(sp, "category") || undefined, commodity: s(sp, "commodity") || undefined };
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("browse.allListings") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("browse.allListings"), path: "/listings" }])} />
      <PageHeader title={commodity ? t("browse.listingsFor", { name: lname(locale, commodity) }) : category ? t("browse.listingsFor", { name: lname(locale, category) }) : t("browse.allListings")} subtitle={t("browse.listingsSub")}>
        <div className="mt-3 flex flex-wrap gap-2">
          {tree.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/listings?category=${c.slug}`} className={`inline-block min-h-[40px] rounded-full border px-3 py-1.5 text-sm ${category?.id === c.id ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface hover:border-primary"}`}>
              {lname(locale, c)}
            </Link>
          ))}
        </div>
      </PageHeader>
      <ListingFilters t={t} action="/listings" values={values} cities={cityOptions} hidden={hidden} showQuery />
      <ListingResults
        t={t}
        result={result}
        hrefFor={(p) => pageHref("/listings", sp, p)}
        emptyAction={
          <>
            <LinkButton href="/rfq/new" variant="primary">
              {t("action.createRfq")}
            </LinkButton>
            <LinkButton href="/sell" variant="accent">
              {t("action.createListing")}
            </LinkButton>
          </>
        }
      />
    </div>
  );
}
