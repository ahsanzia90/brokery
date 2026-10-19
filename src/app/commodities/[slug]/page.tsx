import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { createTranslator } from "@/lib/i18n/translate";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCommodityById, getCommodityBySlug } from "@/lib/data/taxonomy";
import { loadCommodityContext } from "@/lib/data/commodity-page";
import { searchListings } from "@/lib/data/listings";
import { searchSuppliers } from "@/lib/data/suppliers";
import { getGuidesForCommodity } from "@/lib/data/content";
import { getLatestPublishedRates } from "@/lib/data/rates-summary";
import { getSetting } from "@/lib/config/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorited } from "@/lib/favorites/queries";
import { track } from "@/lib/analytics/track";
import { lname, pageHref, parseListingFilters, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PriceRow, SupplierCard } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommodityBySlug(slug);
  if (!c) return { title: "Not found" };
  const t = createTranslator("en");
  return buildMetadata({
    path: `/commodities/${c.slug}`,
    entity: { type: "commodity", id: c.id },
    title: c.seoTitle || t("browse.seo.commodityTitle", { name: c.nameEn }),
    description: c.seoDescription || c.description || t("browse.intro.commodity", { name: c.nameEn }),
    noindex: c.status !== "active",
  });
}

export default async function CommodityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const ctx = await loadCommodityContext(slug, locale);
  if (!ctx) return redirectOr404();
  const { commodity } = ctx;
  if (commodity.status === "merged" && commodity.mergedIntoId) {
    const target = await getCommodityById(commodity.mergedIntoId);
    if (target) permanentRedirect(`/commodities/${target.slug}`);
  }
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const { params: sparams, values } = parseListingFilters(sp, { commodityId: commodity.id, pageSize: 12 });
  const [result, rates, suppliers, guides, user] = await Promise.all([
    searchListings(sparams, locale),
    getLatestPublishedRates({ commodityId: commodity.id, limit: 8 }, locale, staleDays),
    searchSuppliers({ commodityId: commodity.id, pageSize: 6 }, locale),
    getGuidesForCommodity(commodity.id),
    getCurrentUser(),
  ]);
  const saved = await isFavorited(user?.id, "commodity", commodity.id);
  await track("commodity_view", { entityType: "commodity", entityId: commodity.id, path: `/commodities/${commodity.slug}` });

  const name = lname(locale, commodity);
  const base = `/commodities/${commodity.slug}`;
  const crumbs = [{ label: t("category.title"), href: "/categories" }, ...ctx.ancestors.map((a) => ({ label: lname(locale, a), href: `/categories/${a.slug}` })), { label: name }];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbs} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ctx.ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` })), { name, path: base }])} />
      <PageHeader title={name} subtitle={(locale === "ur" ? commodity.descriptionUr || commodity.description : commodity.description) || t("browse.intro.commodity", { name })}>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={`/rfq/new?commodity=${commodity.slug}`} variant="primary" size="lg">
            {t("category.buyThis", { name })}
          </LinkButton>
          <LinkButton href={`/dashboard/seller/listings/new?commodity=${commodity.slug}`} variant="accent" size="lg">
            {t("category.sellThis", { name })}
          </LinkButton>
          <FavoriteButton kind="commodity" id={commodity.id} initialSaved={saved} next={base} />
        </div>
      </PageHeader>

      {ctx.varieties.length > 0 && (
        <Section title={t("category.varieties")}>
          <ul className="flex flex-wrap gap-2">
            {ctx.varieties.map((v) => (
              <li key={v.id}>
                <Link href={`${base}/${v.slug}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                  {lname(locale, v)}
                </Link>
              </li>
            ))}
          </ul>
          {ctx.grades.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              {t("category.grades")}: {ctx.grades.map((g) => lname(locale, g)).join(" · ")}
            </p>
          )}
        </Section>
      )}

      {commodity.supportsPriceBenchmark && (
        <Section title={t("browse.currentRates")} subtitle={t("price.disclaimer")} action={rates.length ? { href: `/prices/${commodity.slug}`, label: t("browse.allRates") } : undefined}>
          {rates.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {rates.map((p) => (
                <PriceRow key={p.id} p={p} t={t} locale={locale} staleDays={staleDays} />
              ))}
            </div>
          ) : (
            <EmptyState icon="📈" title={t("price.notAvailable")} body={t("browse.noRates")} action={<Link href={`/rfq/new?commodity=${commodity.slug}`} className="font-semibold text-primary underline">{t("price.requestQuote")}</Link>} />
          )}
        </Section>
      )}

      <Section title={t("browse.listingsFor", { name })} id="listings">
        <ListingFilters t={t} action={`${base}#listings`} values={values} varieties={ctx.varietyOptions} grades={ctx.gradeOptions} cities={ctx.cityOptions} attributes={ctx.attributeFilters} />
        <ListingResults
          t={t}
          result={result}
          hrefFor={(p) => pageHref(base, sp, p) + "#listings"}
          emptyAction={
            <LinkButton href={`/rfq/new?commodity=${commodity.slug}`} variant="primary">
              {t("action.createRfq")}
            </LinkButton>
          }
        />
      </Section>

      <Section title={t("category.suppliersFor", { name })} action={suppliers.total > 6 ? { href: `/suppliers?commodity=${commodity.slug}`, label: t("action.viewAll") } : undefined}>
        {suppliers.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        ) : (
          <Alert tone="info">{t("supplier.empty")} <Link href="/sell" className="font-semibold underline">{t("supplier.registerCta")}</Link></Alert>
        )}
      </Section>

      {ctx.related.length > 0 && (
        <Section title={t("category.related")}>
          <ul className="flex flex-wrap gap-2">
            {ctx.related.map((c) => (
              <li key={c.id}>
                <Link href={`/commodities/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                  {lname(locale, c)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {guides.length > 0 && (
        <Section title={t("category.guides")}>
          <ul className="grid gap-3 md:grid-cols-2">
            {guides.map((g) => (
              <li key={g.id} className="card p-4">
                <Link href={`/guides/${g.slug}`} className="font-bold hover:text-primary">
                  {locale === "ur" && g.titleUr ? g.titleUr : g.titleEn}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-text-muted">{locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
