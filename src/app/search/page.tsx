import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, commodityAliases, searchLogs } from "@/db/schema";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { searchListings, resolveCommodityFromQuery } from "@/lib/data/listings";
import { searchSuppliers } from "@/lib/data/suppliers";
import { getLocationBySlug, getCities, getMajorCities } from "@/lib/data/locations";
import { getCommodityById } from "@/lib/data/taxonomy";
import { normalizeText } from "@/lib/utils/text";
import { track } from "@/lib/analytics/track";
import { getCurrentUser } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { lname, pageHref, parseListingFilters, s, type SP } from "@/lib/data/browse-helpers";
import { SearchBar } from "@/components/layout/search-bar";
import { PageHeader, Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { SupplierCard } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
import { Chip, ChipRow } from "@/components/public/chip";
import { CommodityArt, artKeyFor } from "@/components/illustrations/commodity-art";
import { MissingCommodityForm } from "./missing-commodity-form";

export const metadata: Metadata = { title: "Search", ...NOINDEX };

type Props = { searchParams: Promise<SP> };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const q = s(sp, "q").trim().slice(0, 100);
  const citySlug = s(sp, "city");
  const cityLoc = citySlug ? await getLocationBySlug("city", citySlug) : null;
  const [cities, major] = await Promise.all([getCities(), getMajorCities()]);
  const cityOptions = [...major, ...cities.filter((c) => !c.isMajorMarket)].map((c) => ({ value: c.id, label: lname(locale, c) }));

  if (!q) {
    return (
      <div className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <PageHeader title={t("nav.search")} subtitle={t("home.search.label")} />
          <SearchBar size="lg" autoFocus />
        </div>
      </div>
    );
  }

  const norm = normalizeText(q);
  const like = `%${norm}%`;
  const { params, values } = parseListingFilters(sp, { q, cityId: cityLoc?.id ?? null, pageSize: 12 });
  const [matchedCommodityId, commodityRows, categoryRows, listingResult, supplierResult] = await Promise.all([
    resolveCommodityFromQuery(q),
    db
      .selectDistinctOn([commodities.id], { c: commodities })
      .from(commodities)
      .leftJoin(commodityAliases, eq(commodityAliases.commodityId, commodities.id))
      .where(and(eq(commodities.status, "active"), or(ilike(commodities.nameEn, like), sql`${commodities.nameUr} ILIKE ${like}`, ilike(commodityAliases.normalized, like), sql`similarity(lower(${commodities.nameEn}), ${norm}) > 0.3`, sql`similarity(${commodityAliases.normalized}, ${norm}) > 0.4`)))
      .limit(12),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.status, "active"), or(ilike(categories.nameEn, like), sql`${categories.nameUr} ILIKE ${like}`, sql`EXISTS (SELECT 1 FROM unnest(${categories.aliasesRoman}) a WHERE lower(a) LIKE ${like})`)))
      .limit(6),
    searchListings(params, locale),
    searchSuppliers({ q, cityId: cityLoc?.id ?? null, pageSize: 6 }, locale),
  ]);
  const matched = matchedCommodityId ? await getCommodityById(matchedCommodityId) : null;
  const total = commodityRows.length + categoryRows.length + listingResult.total + supplierResult.total;

  // Log the search (no raw IP) and track.
  try {
    const user = await getCurrentUser();
    const c = await cookies();
    await db.insert(searchLogs).values({ queryText: q, normalized: norm, resultCount: total, userId: user?.id ?? null, anonymousId: c.get("ml_anon")?.value ?? null, locationId: cityLoc?.id ?? null });
    await track(total === 0 ? "zero_result_search" : "search", { path: "/search", properties: { q, resultCount: total, city: citySlug || undefined } });
  } catch {}

  const title = t("search.title", { q }) + (cityLoc ? ` ${t("search.inCity", { city: lname(locale, cityLoc) })}` : "");
  return (
    <div className="container-page py-5 md:py-6">
      <div className="mb-6 max-w-2xl">
        <SearchBar initialQuery={q} />
      </div>
      <PageHeader title={title} subtitle={total > 0 ? t("common.results", { count: total }) : undefined} />

      {matched && (
        <Link href={`/commodities/${matched.slug}${cityLoc ? `/city/${cityLoc.slug}` : ""}`} className="group mb-8 flex flex-col gap-3 rounded-[var(--r-lg)] bg-tint-mint p-4 transition-colors hover:bg-brand-100 sm:flex-row sm:items-center sm:gap-4 md:p-5">
          <span className="flex items-center gap-3 sm:contents">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-white/70">
              <CommodityArt artKey={artKeyFor(matched.slug, matched.nameEn)} className="h-10 w-10" />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold uppercase tracking-wide text-brand-700">{t("search.commodities")}</span>
            <span className="block text-[18px] font-bold text-ink">{t("browse.searchQuickCommodity", { name: lname(locale, matched) })}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-brand-800">
            {t("browse.goToCommodity", { name: lname(locale, matched) })} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
          </span>
        </Link>
      )}

      {total === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="panel panel-sand">
            <SearchX className="h-8 w-8 text-brand-800" aria-hidden />
            <h2 className="mt-3 text-[22px] font-bold text-ink">{t("search.noResults", { q })}</h2>
            <p className="mt-2 text-[15px] text-ink-2">{t("search.noResultsHint")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <LinkButton href={`/rfq/new?q=${encodeURIComponent(q)}`} variant="primary">
                {t("search.requestCommodity")}
              </LinkButton>
              <LinkButton href="/categories" variant="outline">
                {t("category.title")}
              </LinkButton>
            </div>
          </div>
          <MissingCommodityForm initialName={q} />
        </div>
      ) : (
        <>
          {(commodityRows.length > 0 || categoryRows.length > 0) && (
            <section className="mb-8 grid gap-6 md:grid-cols-2">
              {commodityRows.length > 0 && (
                <div>
                  <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">{t("search.commodities")}</h2>
                  <ChipRow>
                    {commodityRows.map(({ c }) => (
                      <li key={c.id}>
                        <Chip href={`/commodities/${c.slug}`} size="sm">
                          {lname(locale, c)}
                        </Chip>
                      </li>
                    ))}
                  </ChipRow>
                </div>
              )}
              {categoryRows.length > 0 && (
                <div>
                  <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">{t("search.categories")}</h2>
                  <ChipRow>
                    {categoryRows.map((c) => (
                      <li key={c.id}>
                        <Chip href={`/categories/${c.slug}`} size="sm">
                          {lname(locale, c)}
                        </Chip>
                      </li>
                    ))}
                  </ChipRow>
                </div>
              )}
            </section>
          )}

          <Section title={t("browse.searchListings")} id="listings" subtitle={listingResult.total > 0 ? t("browse.resultsCount", { count: listingResult.total }) : undefined} className="!pt-0">
            <ListingFilters t={t} action="/search#listings" values={{ ...values, city: cityLoc?.id ?? values.city }} cities={cityOptions} hidden={{ q }} />
            <ListingResults
              t={t}
              result={listingResult}
              hrefFor={(p) => pageHref("/search", sp, p) + "#listings"}
              emptyAction={
                <LinkButton href={`/rfq/new?q=${encodeURIComponent(q)}${matched ? `&commodity=${matched.slug}` : ""}`} variant="primary">
                  {t("search.requestCommodity")}
                </LinkButton>
              }
            />
          </Section>

          {supplierResult.items.length > 0 && (
            <Section eyebrow={t("common.suppliers")} title={t("search.suppliers")} action={supplierResult.total > 6 ? { href: `/suppliers?q=${encodeURIComponent(q)}`, label: t("action.viewAll") } : undefined}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {supplierResult.items.map((sup) => (
                  <SupplierCard key={sup.id} s={sup} t={t} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
