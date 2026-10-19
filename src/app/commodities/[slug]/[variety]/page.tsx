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
import { PageHeader, Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { PriceRow } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
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
  const [result, rates, totalCommodity] = await Promise.all([searchListings(sparams, locale), getLatestPublishedRates({ commodityId: ctx.commodity.id, varietyId: variety.id, limit: 8 }, locale, staleDays), getListingCountForCommodity(ctx.commodity.id)]);
  const cname = lname(locale, ctx.commodity);
  const vname = lname(locale, variety);
  const base = `/commodities/${ctx.commodity.slug}/${variety.slug}`;
  const crumbPaths = [{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ctx.ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` })), { name: cname, path: `/commodities/${ctx.commodity.slug}` }, { name: vname, path: base }];
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbPaths.slice(1).map((c, i, arr) => (i === arr.length - 1 ? { label: c.name } : { label: c.name, href: c.path }))} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd(crumbPaths)} />
      <PageHeader title={`${vname} — ${cname}`} subtitle={variety.description || t("browse.varietyOf", { variety: vname, commodity: cname })}>
        {variety.aliasesRoman.length > 0 && <p className="mt-1 text-sm text-text-muted">{variety.aliasesRoman.join(" · ")}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="primary">
            {t("category.buyThis", { name: vname })}
          </LinkButton>
          <LinkButton href={`/dashboard/seller/listings/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="accent">
            {t("category.sellThis", { name: vname })}
          </LinkButton>
        </div>
      </PageHeader>
      {grades.length > 0 && (
        <p className="mb-4 text-text-muted">
          <span className="font-semibold">{t("category.grades")}:</span> {grades.map((g) => lname(locale, g)).join(" · ")}
        </p>
      )}
      {rates.length > 0 && (
        <Section title={t("browse.currentRates")} action={{ href: `/prices/${ctx.commodity.slug}`, label: t("browse.allRates") }}>
          <div className="grid gap-3 md:grid-cols-2">
            {rates.map((p) => (
              <PriceRow key={p.id} p={p} t={t} locale={locale} staleDays={staleDays} />
            ))}
          </div>
        </Section>
      )}
      <Section title={t("browse.listingsFor", { name: vname })} id="listings">
        <ListingFilters t={t} action={`${base}#listings`} values={values} grades={grades.map((g) => ({ value: g.id, label: lname(locale, g) }))} cities={ctx.cityOptions} attributes={ctx.attributeFilters} />
        <ListingResults
          t={t}
          result={result}
          hrefFor={(p) => pageHref(base, sp, p) + "#listings"}
          emptyBody={totalCommodity > 0 ? `${t("listing.emptyHint")}` : undefined}
          emptyAction={
            <>
              {totalCommodity > 0 && (
                <Link href={`/commodities/${ctx.commodity.slug}#listings`} className="font-semibold text-primary underline">
                  {t("browse.listingsFor", { name: cname })} ({totalCommodity})
                </Link>
              )}
              <LinkButton href={`/rfq/new?commodity=${ctx.commodity.slug}&variety=${variety.slug}`} variant="primary">
                {t("action.createRfq")}
              </LinkButton>
            </>
          }
        />
      </Section>
      {ctx.varieties.length > 1 && (
        <Section title={t("category.varieties")}>
          <ul className="flex flex-wrap gap-2">
            {ctx.varieties
              .filter((v) => v.id !== variety.id)
              .map((v) => (
                <li key={v.id}>
                  <Link href={`/commodities/${ctx.commodity.slug}/${v.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                    {lname(locale, v)}
                  </Link>
                </li>
              ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
