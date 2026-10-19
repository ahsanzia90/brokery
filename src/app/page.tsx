import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getBrand, getSetting } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFeaturedCategories, getFeaturedSuppliers, getHomepageSections, getListingCountsByCategory, getPublishedGuides, getRecentListings, getTodaysRates } from "@/lib/data/home";
import { getCategoryTree, getPopularCommodities } from "@/lib/data/taxonomy";
import { getMajorCities } from "@/lib/data/locations";
import { SearchBar } from "@/components/layout/search-bar";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryCard, ListingCard, PriceRow, SupplierCard } from "@/components/marketplace/cards";
import { HeroActions } from "@/components/marketplace/hero-actions";
import { formatDate } from "@/lib/utils/format";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return buildMetadata({
    path: "/",
    title: `${brand.productName} — Commodity Prices, Suppliers & Buyers`,
    description: `Find commodities, check published market rates (mandi rates) and contact suppliers across Pakistan. Free B2B marketplace: ${brand.tagline}`,
  });
}

export default async function HomePage() {
  const { t, locale } = await getT();
  const [brand, sections, staleDays] = await Promise.all([getBrand(), getHomepageSections(), getSetting<number>("prices.stale_after_days", 7)]);
  const enabled = new Set(sections.map((s) => s.key));
  const [featuredCats, counts, rates, recent, suppliers, guides, tree, cities, popular] = await Promise.all([
    getFeaturedCategories(),
    getListingCountsByCategory(),
    enabled.has("prices") ? getTodaysRates(locale, staleDays, 8) : [],
    enabled.has("listings") ? getRecentListings(locale, 6) : [],
    enabled.has("suppliers") ? getFeaturedSuppliers(locale, 6) : [],
    enabled.has("guides") ? getPublishedGuides(3) : [],
    getCategoryTree(),
    getMajorCities(),
    getPopularCommodities(10),
  ]);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);

  return (
    <div className="container-page">
      {/* Hero: one clear question, two equal actions */}
      <section className="py-8 md:py-12" aria-labelledby="hero-q">
        <h1 id="hero-q" className="text-center text-2xl font-extrabold md:text-4xl">
          {t("home.question")}
        </h1>
        <p className="mt-1 text-center text-text-muted">{t("home.question.sub")}</p>
        <HeroActions
          buy={{ title: t("home.buy.title"), sub: t("home.buy.sub"), en: t("home.buy.en") }}
          sell={{ title: t("home.sell.title"), sub: t("home.sell.sub"), en: t("home.sell.en") }}
        />
        <div className="mx-auto mt-8 max-w-2xl">
          <label htmlFor="home-search" className="mb-2 block text-center font-semibold">
            {t("home.search.label")}
          </label>
          <SearchBar size="lg" />
          {popular.length > 0 && (
            <ul className="mt-3 flex flex-wrap justify-center gap-2 text-sm" aria-label={t("search.popular")}>
              {popular.map((c) => (
                <li key={c.id}>
                  <Link href={`/commodities/${c.slug}`} className="inline-block rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                    {name(c)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-text-muted">{t("home.free")}</p>
      </section>

      {enabled.has("categories") && (
        <Section title={t("home.categories.title")} action={{ href: "/categories", label: t("home.categories.all") }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredCats.map((c) => (
              <CategoryCard key={c.id} c={{ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr, icon: c.icon, imagePath: c.imagePath, count: counts.get(c.id) }} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      {enabled.has("prices") && (
        <Section title={t("home.prices.title")} subtitle={t("home.prices.sub")} action={{ href: "/prices", label: t("home.prices.all") }}>
          {rates.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {rates.map((p) => (
                <PriceRow key={p.id} p={p} t={t} locale={locale} staleDays={staleDays} />
              ))}
            </div>
          ) : (
            <EmptyState icon="📈" title={t("price.notAvailable")} body={t("home.prices.empty")} action={<Link href="/rfq/new" className="font-semibold text-primary underline">{t("price.requestQuote")}</Link>} />
          )}
        </Section>
      )}

      {enabled.has("listings") && (
        <Section title={t("home.listings.title")} action={{ href: "/listings", label: t("home.listings.all") }}>
          {recent.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((l) => (
                <ListingCard key={l.id} l={l} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState icon="📦" title={t("listing.empty")} body={t("home.listings.empty")} action={<Link href="/sell" className="font-semibold text-primary underline">{t("action.createListing")}</Link>} />
          )}
        </Section>
      )}

      {enabled.has("suppliers") && suppliers.length > 0 && (
        <Section title={t("home.suppliers.title")} action={{ href: "/suppliers", label: t("home.suppliers.all") }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        </Section>
      )}

      {enabled.has("how_it_works") && (
        <Section title={t("home.how.title")}>
          <ol className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="card p-5">
                <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white num" aria-hidden>
                  {n}
                </span>
                <h3 className="text-lg font-bold">{t(`home.how.${n}.title`)}</h3>
                <p className="mt-1 text-text-muted">{t(`home.how.${n}.body`)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 text-center">
            <Link href="/how-it-works" className="font-semibold text-primary underline-offset-2 hover:underline">
              {t("footer.howItWorks")} ›
            </Link>
          </div>
        </Section>
      )}

      {enabled.has("browse_categories") && (
        <Section title={t("home.browse.title")}>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((c) => (
              <div key={c.id}>
                <h3 className="font-bold">
                  <Link href={`/categories/${c.slug}`} className="hover:text-primary">
                    {c.icon ? <span aria-hidden>{c.icon} </span> : null}
                    {name(c)}
                  </Link>
                </h3>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.95rem] text-text-muted">
                  {c.children.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <Link href={`/categories/${s.slug}`} className="hover:text-primary hover:underline">
                        {name(s)}
                      </Link>
                    </li>
                  ))}
                  {c.children.length > 5 && (
                    <li>
                      <Link href={`/categories/${c.slug}`} className="font-semibold text-primary">
                        +{c.children.length - 5}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {enabled.has("browse_cities") && (
        <Section title={t("home.cities.title")} action={{ href: "/markets", label: t("market.title") }}>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={`/suppliers/${c.slug}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                  {name(c)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {enabled.has("guides") && guides.length > 0 && (
        <Section title={t("home.guides.title")} action={{ href: "/guides", label: t("home.guides.all") }}>
          <div className="grid gap-4 md:grid-cols-3">
            {guides.map((g) => (
              <article key={g.slug} className="card p-5">
                <h3 className="text-lg font-bold">
                  <Link href={`/guides/${g.slug}`} className="hover:text-primary">
                    {locale === "ur" && g.titleUr ? g.titleUr : g.titleEn}
                  </Link>
                </h3>
                <p className="mt-1 line-clamp-3 text-text-muted">{locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn}</p>
                {g.publishedAt && <p className="mt-2 text-sm text-text-muted num">{formatDate(g.publishedAt, locale)}</p>}
              </article>
            ))}
          </div>
        </Section>
      )}
      <p className="sr-only">{brand.tagline}</p>
    </div>
  );
}
