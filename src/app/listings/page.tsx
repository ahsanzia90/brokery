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
import { Chip, ChipRow } from "@/components/public/chip";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

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
  const title = commodity ? t("browse.listingsFor", { name: lname(locale, commodity) }) : category ? t("browse.listingsFor", { name: lname(locale, category) }) : t("browse.allListings");
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("browse.allListings") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("browse.allListings"), path: "/listings" }])} />
      <PageHeader eyebrow={t("home.listings.eyebrow")} title={title} subtitle={t("browse.listingsSub")}>
        <ChipRow className="mt-5" scroll>
          <li>
            <Chip href="/listings" size="sm" active={!category}>
              {t("common.all")}
            </Chip>
          </li>
          {tree.map((c) => (
            <li key={c.id}>
              <Chip href={`/listings?category=${c.slug}`} size="sm" active={category?.id === c.id}>
                {lname(locale, c)}
              </Chip>
            </li>
          ))}
        </ChipRow>
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
            <LinkButton href="/sell" variant="outline">
              {t("action.createListing")}
            </LinkButton>
          </>
        }
      />
    </div>
  );
}
