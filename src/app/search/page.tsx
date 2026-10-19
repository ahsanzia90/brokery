import type { Metadata } from "next";
import Link from "next/link";
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
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { SupplierCard } from "@/components/marketplace/cards";
import { ListingFilters } from "@/components/marketplace/listing-filters";
import { ListingResults } from "@/components/marketplace/listing-results";
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
      <div className="container-page py-6">
        <PageHeader title={t("nav.search")} subtitle={t("home.search.label")} />
        <div className="max-w-2xl">
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
    <div className="container-page py-6">
      <PageHeader title={title} />
      <div className="mb-6 max-w-2xl">
        <SearchBar initialQuery={q} />
      </div>

      {matched && (
        <Alert tone="success" className="mb-5">
          {t("browse.searchQuickCommodity", { name: lname(locale, matched) })}{" "}
          <Link href={`/commodities/${matched.slug}${cityLoc ? `/city/${cityLoc.slug}` : ""}`} className="font-semibold underline">
            {t("browse.goToCommodity", { name: lname(locale, matched) })} ›
          </Link>
        </Alert>
      )}

      {total === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-bold">{t("search.noResults", { q })}</h2>
            <p className="mt-2 text-text-muted">{t("search.noResultsHint")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
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
            <section className="mb-6 grid gap-4 md:grid-cols-2">
              {commodityRows.length > 0 && (
                <div className="card p-4">
                  <h2 className="mb-2 font-bold">{t("search.commodities")}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {commodityRows.map(({ c }) => (
                      <li key={c.id}>
                        <Link href={`/commodities/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                          {lname(locale, c)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {categoryRows.length > 0 && (
                <div className="card p-4">
                  <h2 className="mb-2 font-bold">{t("search.categories")}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {categoryRows.map((c) => (
                      <li key={c.id}>
                        <Link href={`/categories/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                          {lname(locale, c)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <Section title={t("browse.searchListings")} id="listings">
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
            <Section title={t("search.suppliers")} action={supplierResult.total > 6 ? { href: `/suppliers?q=${encodeURIComponent(q)}`, label: t("action.viewAll") } : undefined}>
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
