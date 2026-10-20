import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCommodityBySlug } from "@/lib/data/taxonomy";
import { getLocationBySlug, getMajorCities, getMarkets } from "@/lib/data/locations";
import { loadCommodityContext } from "@/lib/data/commodity-page";
import { getListingCountForCommodity, searchListings } from "@/lib/data/listings";
import { searchSuppliers } from "@/lib/data/suppliers";
import { countPublishedRates, getLatestPublishedRates } from "@/lib/data/rates-summary";
import { getSetting } from "@/lib/config/settings";
import { lname, pageHref, parseListingFilters, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { SupplierCard } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { PageHero } from "@/components/public/page-hero";
import { RatesBand } from "@/components/public/rates-band";
import { Chip, ChipRow } from "@/components/public/chip";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string; city: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city } = await params;
  const c = await getCommodityBySlug(slug);
  const loc = await getLocationBySlug("city", city);
  if (!c || !loc) return { title: "Not found" };
  const markets = await getMarkets(loc.id);
  const locIds = [loc.id, ...markets.map((m) => m.id)];
  const [listingCount, priceCount] = await Promise.all([getListingCountForCommodity(c.id, loc.id), countPublishedRates(c.id, locIds)]);
  return buildMetadata({
    path: `/commodities/${c.slug}/city/${loc.slug}`,
    title: `${c.nameEn} Suppliers and Rates in ${loc.nameEn}`,
    description: `Compare ${c.nameEn.toLowerCase()} supplier listings and published market rates in ${loc.nameEn}, Pakistan. Contact suppliers directly or post a buying request.`,
    noindex: listingCount === 0 && priceCount === 0,
  });
}

export default async function CommodityCityPage({ params, searchParams }: Props) {
  const { slug, city } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [ctx, loc] = await Promise.all([loadCommodityContext(slug, locale), getLocationBySlug("city", city)]);
  if (!ctx || !loc) return redirectOr404();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const markets = await getMarkets(loc.id);
  const locIds = [loc.id, ...markets.map((m) => m.id)];
  const { params: sparams, values } = parseListingFilters(sp, { commodityId: ctx.commodity.id, cityId: loc.id, pageSize: 12 });
  const [result, rates, suppliers, majorCities] = await Promise.all([
    searchListings(sparams, locale),
    getLatestPublishedRates({ commodityId: ctx.commodity.id, locationIds: locIds, limit: 10 }, locale, staleDays),
    searchSuppliers({ commodityId: ctx.commodity.id, cityId: loc.id, pageSize: 6 }, locale),
    getMajorCities(),
  ]);
  const cname = lname(locale, ctx.commodity);
  const cityName = lname(locale, loc);
  const base = `/commodities/${ctx.commodity.slug}/city/${loc.slug}`;
  const title = t("browse.inCityTitle", { name: cname, city: cityName });
  const crumbPaths = [{ name: t("common.home"), path: "/" }, { name: cname, path: `/commodities/${ctx.commodity.slug}` }, { name: cityName, path: base }];
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: cname, href: `/commodities/${ctx.commodity.slug}` }, { label: cityName }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd(crumbPaths)} />
      <PageHero
        eyebrow={`${cname} · ${t("browse.heroEyebrow.city")}`}
        title={title}
        altName={locale === "ur" ? loc.nameEn : loc.nameUr}
        intro={t("browse.intro.commodity", { name: cname })}
        slug={ctx.commodity.slug}
        name={ctx.commodity.nameEn}
        imagePath={ctx.commodity.imagePath}
        actions={
          <>
            <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&city=${loc.slug}`} variant="primary" size="lg">
              {t("action.requestQuote")}
            </LinkButton>
            <LinkButton href={`/dashboard/seller/listings/new?commodity=${ctx.commodity.slug}`} variant="outline" size="lg" className="bg-white/70">
              {t("category.sellThis", { name: cname })}
            </LinkButton>
          </>
        }
      />
      {ctx.commodity.supportsPriceBenchmark && (
        <div className="mt-5 md:mt-6">
          <RatesBand rates={rates} t={t} locale={locale} title={t("browse.ratesIn", { name: cityName })} href={`/prices/${ctx.commodity.slug}/${loc.slug}`} empty={<>{t("browse.noRates")} <Link href={`/prices/${ctx.commodity.slug}`} className="font-semibold text-lime-400 underline underline-offset-4">{t("browse.allRates")}</Link></>} />
        </div>
      )}
      <Section title={t("browse.listingsIn", { name: cityName })} id="listings" subtitle={result.total > 0 ? t("browse.resultsCount", { count: result.total }) : undefined}>
        <ListingFilters t={t} action={`${base}#listings`} values={{ ...values, city: "" }} varieties={ctx.varietyOptions} grades={ctx.gradeOptions} cities={[]} attributes={ctx.attributeFilters} />
        <ListingResults
          t={t}
          result={result}
          hrefFor={(p) => pageHref(base, sp, p) + "#listings"}
          emptyAction={
            <>
              <LinkButton href={`/commodities/${ctx.commodity.slug}#listings`} variant="outline">
                {t("browse.allListings")}: {cname}
              </LinkButton>
              <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&city=${loc.slug}`} variant="primary">
                {t("action.createRfq")}
              </LinkButton>
            </>
          }
        />
      </Section>
      {suppliers.items.length > 0 && (
        <Section eyebrow={t("common.suppliers")} title={t("supplier.inCity", { city: cityName })} action={{ href: `/suppliers/${loc.slug}?commodity=${ctx.commodity.slug}`, label: t("action.viewAll") }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        </Section>
      )}
      <section className="border-t border-line py-10">
        <h2 className="text-[18px] font-bold text-ink">{t("browse.otherCities")}</h2>
        <ChipRow className="mt-3">
          {majorCities.map((c) => (
            <li key={c.id}>
              <Chip href={`/commodities/${ctx.commodity.slug}/city/${c.slug}`} size="sm" active={c.id === loc.id}>
                {lname(locale, c)}
              </Chip>
            </li>
          ))}
        </ChipRow>
      </section>
    </div>
  );
}
