import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";
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
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { SupplierCard } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { PageHero } from "@/components/public/page-hero";
import { RatesBand } from "@/components/public/rates-band";
import { Chip, ChipRow } from "@/components/public/chip";
import { GuideCard } from "@/components/public/guide-card";
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
    getLatestPublishedRates({ commodityId: commodity.id, limit: 10 }, locale, staleDays),
    searchSuppliers({ commodityId: commodity.id, pageSize: 6 }, locale),
    getGuidesForCommodity(commodity.id),
    getCurrentUser(),
  ]);
  const saved = await isFavorited(user?.id, "commodity", commodity.id);
  await track("commodity_view", { entityType: "commodity", entityId: commodity.id, path: `/commodities/${commodity.slug}` });

  const name = lname(locale, commodity);
  const altName = locale === "ur" ? commodity.nameEn : commodity.nameUr;
  const base = `/commodities/${commodity.slug}`;
  const parent = ctx.ancestors[ctx.ancestors.length - 1];
  const crumbs = [{ label: t("category.title"), href: "/categories" }, ...ctx.ancestors.map((a) => ({ label: lname(locale, a), href: `/categories/${a.slug}` })), { label: name }];
  const intro = (locale === "ur" ? commodity.descriptionUr || commodity.description : commodity.description) || t("browse.intro.commodity", { name });

  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={crumbs} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ctx.ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` })), { name, path: base }])} />

      <PageHero
        eyebrow={parent ? lname(locale, parent) : t("browse.heroEyebrow.commodity")}
        title={name}
        altName={altName}
        intro={intro}
        slug={commodity.slug}
        name={commodity.nameEn}
        imagePath={commodity.imagePath}
        actions={
          <>
            <LinkButton href={`/rfq/new?commodity=${commodity.slug}`} variant="primary" size="lg">
              {t("action.requestQuote")}
            </LinkButton>
            <LinkButton href={`/dashboard/seller/listings/new?commodity=${commodity.slug}`} variant="outline" size="lg" className="bg-white/70">
              {t("category.sellThis", { name })}
            </LinkButton>
            <FavoriteButton kind="commodity" id={commodity.id} initialSaved={saved} next={base} />
          </>
        }
      >
        {ctx.varieties.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">{t("category.varieties")}</p>
            <ChipRow scroll>
              {ctx.varieties.slice(0, 14).map((v) => (
                <li key={v.id}>
                  <Chip href={`${base}/${v.slug}`} size="sm" className="bg-white/80">
                    {lname(locale, v)}
                  </Chip>
                </li>
              ))}
              {ctx.varieties.length > 14 && (
                <li className="self-center text-[13px] text-muted num">+{ctx.varieties.length - 14}</li>
              )}
            </ChipRow>
          </div>
        )}
      </PageHero>

      {commodity.supportsPriceBenchmark && (
        <div className="mt-5 md:mt-6">
          <RatesBand
            rates={rates}
            t={t}
            locale={locale}
            title={t("browse.ratesTitle", { name })}
            href={`/prices/${commodity.slug}`}
            empty={
              <>
                {t("browse.noRates")}{" "}
                <Link href={`/rfq/new?commodity=${commodity.slug}`} className="font-semibold text-lime-400 underline underline-offset-4">
                  {t("price.requestQuote")}
                </Link>
              </>
            }
          />
        </div>
      )}

      <Section title={t("browse.listingsFor", { name })} id="listings" subtitle={result.total > 0 ? t("browse.resultsCount", { count: result.total }) : undefined}>
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

      <Section eyebrow={t("common.suppliers")} title={t("category.suppliersFor", { name })} action={suppliers.total > 6 ? { href: `/suppliers?commodity=${commodity.slug}`, label: t("action.viewAll") } : undefined}>
        {suppliers.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Store className="h-6 w-6" />} title={t("supplier.empty")} body={t("supplier.registerCta")} action={<LinkButton href="/sell" variant="outline">{t("footer.registerSupplier")}</LinkButton>} />
        )}
      </Section>

      {(ctx.related.length > 0 || ctx.grades.length > 0) && (
        <section className="grid gap-8 border-t border-line py-10 md:grid-cols-2 md:py-12">
          {ctx.related.length > 0 && (
            <div>
              <h2 className="text-[18px] font-bold text-ink">{t("category.related")}</h2>
              <ChipRow className="mt-3">
                {ctx.related.map((c) => (
                  <li key={c.id}>
                    <Chip href={`/commodities/${c.slug}`} size="sm">
                      {lname(locale, c)}
                    </Chip>
                  </li>
                ))}
              </ChipRow>
            </div>
          )}
          {ctx.grades.length > 0 && (
            <div>
              <h2 className="text-[18px] font-bold text-ink">{t("category.grades")}</h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-ink-2">
                {ctx.grades.map((g) => (
                  <li key={g.id} className="before:me-2 before:text-muted-2 before:content-['·'] first:before:content-none">
                    {lname(locale, g)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {guides.length > 0 && (
        <Section eyebrow={t("nav.guides")} title={t("category.guides")} action={{ href: "/guides", label: t("browse.allGuides") }}>
          <div className="grid gap-4 md:grid-cols-3">
            {guides.slice(0, 3).map((g, i) => (
              <GuideCard key={g.id} g={g} locale={locale} index={i} moreLabel={t("browse.readMore")} />
            ))}
          </div>
        </Section>
      )}

      <div className="mb-4 flex items-center justify-end">
        <Link href="/categories" className="inline-flex items-center gap-1 text-[14px] font-semibold text-brand-800">
          {t("home.categories.all")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
