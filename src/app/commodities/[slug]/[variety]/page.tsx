import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCommodityBySlug, getVarietyBySlug, getGrades } from "@/lib/data/taxonomy";
import { loadCommodityContext } from "@/lib/data/commodity-page";
import { getListingCountForCommodity, searchListings } from "@/lib/data/listings";
import { countPublishedRates, getLatestPublishedRates } from "@/lib/data/rates-summary";
import { getSetting } from "@/lib/config/settings";
import { lname, pageHref, parseListingFilters, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { PageHero } from "@/components/public/page-hero";
import { RatesBand } from "@/components/public/rates-band";
import { Chip, ChipRow } from "@/components/public/chip";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

type Props = { params: Promise<{ slug: string; variety: string }>; searchParams: Promise<SP> };

async function varietyStats(commodityId: string, varietyId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(listings).where(and(eq(listings.commodityId, commodityId), eq(listings.varietyId, varietyId), eq(listings.status, "published")));
  const prices = await countPublishedRates(commodityId, null, varietyId);
  return { listingCount: Number(r?.n ?? 0), priceCount: prices };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, variety } = await params;
  const c = await getCommodityBySlug(slug);
  if (!c) return { title: "Not found" };
  const v = await getVarietyBySlug(c.id, variety);
  if (!v) return { title: "Not found" };
  const stats = await varietyStats(c.id, v.id);
  return buildMetadata({
    path: `/commodities/${c.slug}/${v.slug}`,
    entity: { type: "variety", id: v.id },
    title: `${v.nameEn} ${c.nameEn} Suppliers and Rates in Pakistan`,
    description: v.description || `Find ${v.nameEn} ${c.nameEn.toLowerCase()} suppliers, compare listings and check published rates in Pakistan.`,
    noindex: stats.listingCount === 0 && stats.priceCount === 0,
  });
}

export default async function VarietyPage({ params, searchParams }: Props) {
  const { slug, variety: vslug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const ctx = await loadCommodityContext(slug, locale);
  if (!ctx) return redirectOr404();
  const variety = await getVarietyBySlug(ctx.commodity.id, vslug);
  if (!variety) return redirectOr404();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const grades = await getGrades(ctx.commodity.id, variety.id);
  const { params: sparams, values } = parseListingFilters(sp, { commodityId: ctx.commodity.id, varietyId: variety.id, pageSize: 12 });
  const [result, rates, totalCommodity] = await Promise.all([searchListings(sparams, locale), getLatestPublishedRates({ commodityId: ctx.commodity.id, varietyId: variety.id, limit: 10 }, locale, staleDays), getListingCountForCommodity(ctx.commodity.id)]);
  const cname = lname(locale, ctx.commodity);
  const vname = lname(locale, variety);
  const altName = locale === "ur" ? variety.nameEn : variety.nameUr;
  const base = `/commodities/${ctx.commodity.slug}/${variety.slug}`;
  const crumbPaths = [{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ctx.ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` })), { name: cname, path: `/commodities/${ctx.commodity.slug}` }, { name: vname, path: base }];
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={crumbPaths.slice(1).map((c, i, arr) => (i === arr.length - 1 ? { label: c.name } : { label: c.name, href: c.path }))} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd(crumbPaths)} />
      <PageHero
        eyebrow={`${t("browse.heroEyebrow.variety")} · ${cname}`}
        title={vname}
        altName={altName}
        intro={variety.description || t("browse.varietyOf", { variety: vname, commodity: cname })}
        slug={ctx.commodity.slug}
        name={ctx.commodity.nameEn}
        imagePath={ctx.commodity.imagePath}
        actions={
          <>
            <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="primary" size="lg">
              {t("action.requestQuote")}
            </LinkButton>
            <LinkButton href={`/dashboard/seller/listings/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="outline" size="lg" className="bg-white/70">
              {t("category.sellThis", { name: vname })}
            </LinkButton>
          </>
        }
      >
        {(variety.aliasesRoman.length > 0 || grades.length > 0) && (
          <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
            {variety.aliasesRoman.length > 0 && (
              <div>
                <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("search.suggestions")}</dt>
                <dd className="mt-0.5 text-ink-2">{variety.aliasesRoman.join(" · ")}</dd>
              </div>
            )}
            {grades.length > 0 && (
              <div>
                <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("category.grades")}</dt>
                <dd className="mt-0.5 text-ink-2">{grades.map((g) => lname(locale, g)).join(" · ")}</dd>
              </div>
            )}
          </dl>
        )}
      </PageHero>

      {ctx.commodity.supportsPriceBenchmark && (
        <div className="mt-5 md:mt-6">
          <RatesBand rates={rates} t={t} locale={locale} title={t("browse.ratesTitle", { name: `${vname} ${cname}` })} href={`/prices/${ctx.commodity.slug}`} empty={<>{t("browse.noRates")} <Link href={`/prices/${ctx.commodity.slug}`} className="font-semibold text-lime-400 underline underline-offset-4">{t("browse.allRates")}</Link></>} />
        </div>
      )}

      <Section title={t("browse.listingsFor", { name: vname })} id="listings" subtitle={result.total > 0 ? t("browse.resultsCount", { count: result.total }) : undefined}>
        <ListingFilters t={t} action={`${base}#listings`} values={values} grades={grades.map((g) => ({ value: g.id, label: lname(locale, g) }))} cities={ctx.cityOptions} attributes={ctx.attributeFilters} />
        <ListingResults
          t={t}
          result={result}
          hrefFor={(p) => pageHref(base, sp, p) + "#listings"}
          emptyBody={totalCommodity > 0 ? `${t("listing.emptyHint")}` : undefined}
          emptyAction={
            <>
              {totalCommodity > 0 && (
                <LinkButton href={`/commodities/${ctx.commodity.slug}#listings`} variant="outline">
                  {t("browse.listingsFor", { name: cname })} ({totalCommodity})
                </LinkButton>
              )}
              <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="primary">
                {t("action.createRfq")}
              </LinkButton>
            </>
          }
        />
      </Section>

      {ctx.varieties.length > 1 && (
        <section className="border-t border-line py-10">
          <h2 className="text-[18px] font-bold text-ink">
            {t("category.varieties")} · {cname}
          </h2>
          <ChipRow className="mt-3">
            {ctx.varieties.map((v) => (
              <li key={v.id}>
                <Chip href={`/commodities/${ctx.commodity.slug}/${v.slug}`} size="sm" active={v.id === variety.id}>
                  {lname(locale, v)}
                </Chip>
              </li>
            ))}
          </ChipRow>
        </section>
      )}
    </div>
  );
}
