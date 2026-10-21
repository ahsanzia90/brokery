import { CommodityVisual, PhotoBanner } from "@/components/marketplace/commodity-visual";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Handshake, MapPin, Percent, Wallet } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { getBrand, getSetting } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFeaturedCategories, getFeaturedSuppliers, getHomepageSections, getListingCountsByCategory, getPlatformCounts, getPublishedGuides, getRecentListings, getTodaysRates } from "@/lib/data/home";
import { getCategoryTree, getPopularCommodities } from "@/lib/data/taxonomy";
import { getMajorCities } from "@/lib/data/locations";
import { SearchBar } from "@/components/layout/search-bar";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { CategoryCard, ChangeBadge, ListingCard, ListingMedia, RateChip, SupplierCard } from "@/components/marketplace/cards";
import { Check } from "lucide-react";
import { HeroActions } from "@/components/marketplace/hero-actions";
import { formatDate, formatNumber, formatPKR, formatQuantity } from "@/lib/utils/format";

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
  const [featuredCats, counts, rates, recent, suppliers, guides, tree, cities, popular, totals] = await Promise.all([
    getFeaturedCategories(),
    getListingCountsByCategory(),
    enabled.has("prices") ? getTodaysRates(locale, staleDays, 10) : [],
    enabled.has("listings") ? getRecentListings(locale, 6) : [],
    enabled.has("suppliers") ? getFeaturedSuppliers(locale, 3) : [],
    enabled.has("guides") ? getPublishedGuides(3) : [],
    getCategoryTree(),
    getMajorCities(),
    getPopularCommodities(8),
    getPlatformCounts(),
  ]);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  const previewRates = rates.slice(0, 3);
  const previewListing = recent[0];

  return (
    <div>
      {/* ------------------------------------------------ Hero ------------------------------------------------ */}
      <section className="relative overflow-hidden" aria-labelledby="hero-q">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(900px_420px_at_15%_-10%,var(--tint-mint),transparent_60%),radial-gradient(700px_380px_at_90%_0%,var(--tint-lavender),transparent_60%)]" aria-hidden />
        <div className="container-page pt-10 pb-6 md:pt-16 md:pb-10">
          <div className="mx-auto mb-8 hidden max-h-[300px] overflow-hidden rounded-[var(--r-xl)] has-[img]:block" aria-hidden>
            <PhotoBanner photoKey="hero-mandi" className="max-h-[300px]" />
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1 id="hero-q" className="mt-3 text-[34px] font-extrabold leading-[1.08] text-ink md:text-[56px]">
              {t("home.question")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[16px] text-muted md:text-[18px]">{t("home.hero.sub")}</p>
            <div className="mx-auto mt-7 max-w-2xl">
              <SearchBar size="lg" />
              {popular.length > 0 && (
                <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px]" aria-label={t("search.popular")}>
                  <li className="text-muted-2">{t("search.popular")}:</li>
                  {popular.map((c) => (
                    <li key={c.id}>
                      <Link href={`/commodities/${c.slug}`} className="font-semibold text-ink-2 underline-offset-4 hover:text-brand-800 hover:underline">
                        {name(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 01 / 02 action panels */}
          <HeroActions>
            <div className="panel panel-mint relative flex flex-col overflow-hidden">
              <span className="step-no">{t("home.buy.step")}</span>
              <h2 className="mt-1 text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">{t("home.buy.title")}</h2>
              <p className="mt-2 max-w-sm text-[15px] text-ink-2">{t("home.buy.sub")}</p>
              <div className="mt-6 overflow-hidden rounded-[var(--r-md)] border border-black/5 bg-white shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-muted">{t("home.buy.preview")}</span>
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">{t("price.type.indicative")}</span>
                </div>
                {previewRates.length ? (
                  <ul className="divide-y divide-line">
                    {previewRates.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-ink">
                            {p.commodityName}
                            {p.varietyName ? ` · ${p.varietyName}` : ""}
                          </span>
                          <span className="block text-[12px] text-muted num">
                            {p.locationName} · {formatDate(p.observationDate, locale)}
                          </span>
                        </span>
                        <span className="shrink-0 text-end">
                          <span className="block text-[15px] font-extrabold text-ink num">{formatPKR(p.amount)}</span>
                          <span className="flex items-center justify-end gap-1 text-[11px] text-muted"><span className="num">/ {p.unitSymbol}</span> <ChangeBadge value={p.changePercent} /></span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-4 text-[13px] text-muted">{t("price.notAvailable")}</p>
                )}
              </div>
              <div className="h-5" aria-hidden />
              <Link href="/buy" className={buttonClass("primary", "lg", "self-start")} data-track="home_buy_click" style={{ marginTop: "auto" }}>
                {t("home.buy.cta")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>

            <div className="panel panel-lavender relative flex flex-col overflow-hidden">
              <span className="step-no">{t("home.sell.step")}</span>
              <h2 className="mt-1 text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">{t("home.sell.title")}</h2>
              <p className="mt-2 max-w-sm text-[15px] text-ink-2">{t("home.sell.sub")}</p>
              <div className="mt-6 overflow-hidden rounded-[var(--r-md)] border border-black/5 bg-white shadow-[var(--shadow-sm)]">
                <div className="border-b border-line px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-muted">{t("home.sell.preview")}</div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-[var(--r-sm)]">
                    {previewListing ? <ListingMedia imagePath={previewListing.imagePath} alt="" commoditySlug={previewListing.commoditySlug} commodityName={previewListing.commodityName} /> : <div className="flex h-full w-full items-center justify-center bg-tint-sand"><CommodityVisual artKey="grains" className="h-12 w-12" /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-ink">{previewListing ? previewListing.title : t("home.sell.previewTitle")}</p>
                    <p className="text-[13px] text-muted num">{previewListing ? `${formatQuantity(previewListing.quantity, previewListing.unitSymbol)}${previewListing.cityName ? ` · ${previewListing.cityName}` : ""}` : t("home.sell.previewMeta")}</p>
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-brand-800">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {previewListing ? previewListing.businessName : t("home.sell.previewBiz")}
                    </p>
                  </div>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-[14px] text-ink-2">
                {[t("home.sell.point1"), t("home.sell.point2"), t("home.sell.point3")].map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-800" strokeWidth={2.5} aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <div className="h-5" aria-hidden />
              <Link href="/sell" className={buttonClass("dark", "lg", "mt-auto self-start pt-0 [margin-top:auto]")} data-track="home_sell_click" style={{ marginTop: "auto" }}>
                {t("home.sell.cta")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
          </HeroActions>

          {/* trust row */}
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px] font-semibold text-ink-2 md:flex md:flex-wrap md:justify-center md:gap-x-10">
            {[
              { Icon: Wallet, label: t("home.trust.free") },
              { Icon: Percent, label: t("home.trust.noCommission") },
              { Icon: Handshake, label: t("home.trust.direct") },
              { Icon: BadgeCheck, label: t("home.trust.verified") },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand-700" aria-hidden /> {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Rates strip ------------------------------------------------ */}
      {enabled.has("prices") && (
        <section className="bg-brand-950 text-white" aria-labelledby="rates-h">
          <div className="container-page py-8 md:py-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-lime-400">{t("home.rates.eyebrow")}</p>
                <h2 id="rates-h" className="mt-1 text-[22px] font-bold md:text-[26px]">{t("home.rates.title")}</h2>
                <p className="mt-1 text-[13px] text-white/60">{t("home.rates.note")}</p>
              </div>
              <Link href="/prices" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-lime-400 hover:text-lime-100">
                {t("home.prices.all")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
            {rates.length ? (
              <div className="scroll-x">
                {rates.map((p) => (
                  <RateChip key={p.id} p={p} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="rounded-[var(--r-md)] border border-dashed border-white/20 p-5 text-[14px] text-white/70">
                {t("home.prices.empty")}{" "}
                <Link href="/rfq/new" className="font-semibold text-lime-400 underline underline-offset-4">
                  {t("price.requestQuote")}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="container-page">
        {/* ------------------------------------------------ Categories ------------------------------------------------ */}
        {enabled.has("categories") && (
          <Section eyebrow={t("home.categories.eyebrow")} title={t("home.categories.title")} action={{ href: "/categories", label: t("home.categories.all") }}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
              {featuredCats.map((c) => (
                <CategoryCard key={c.id} c={{ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr, icon: c.icon, imagePath: c.imagePath, count: counts.get(c.id) }} locale={locale} />
              ))}
            </div>
          </Section>
        )}

        {/* ------------------------------------------------ Listings ------------------------------------------------ */}
        {enabled.has("listings") && (
          <Section eyebrow={t("home.listings.eyebrow")} title={t("home.listings.title")} action={{ href: "/listings", label: t("home.listings.all") }}>
            {recent.length ? (
              <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-[78vw] sm:[&>*]:w-auto">
                {recent.map((l) => (
                  <ListingCard key={l.id} l={l} t={t} />
                ))}
              </div>
            ) : (
              <EmptyState title={t("listing.empty")} body={t("home.listings.empty")} action={<Link href="/sell" className={buttonClass("primary", "md")}>{t("action.createListing")}</Link>} />
            )}
          </Section>
        )}

        {/* ------------------------------------------------ How it works ------------------------------------------------ */}
        {enabled.has("how_it_works") && (
          <Section eyebrow={t("home.how.eyebrow")} title={t("home.how.title")}>
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                { n: "01.", tint: "panel-sky" },
                { n: "02.", tint: "panel-peach" },
                { n: "03.", tint: "panel-mint" },
              ].map((s, i) => (
                <li key={s.n} className={`panel ${s.tint}`}>
                  <span className="step-no">{s.n}</span>
                  <h3 className="mt-1 text-[20px] font-bold leading-tight text-ink">{t(`home.how.${i + 1}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{t(`home.how.${i + 1}.body`)}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ------------------------------------------------ Suppliers + cities ------------------------------------------------ */}
        {(enabled.has("suppliers") || enabled.has("browse_cities")) && (
          <div className="grid gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-14">
            {enabled.has("browse_cities") && (
              <div>
                <p className="eyebrow mb-2">{t("common.location")}</p>
                <h2 className="text-[22px] font-bold text-ink md:text-[28px]">{t("home.cities.title")}</h2>
                <p className="mt-1.5 text-[15px] text-muted">{t("home.cities.sub")}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <li key={c.id}>
                      <Link href={`/suppliers/${c.slug}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold text-ink-2 hover:border-brand-700 hover:text-brand-900">
                        <MapPin className="h-3.5 w-3.5 text-muted-2" aria-hidden /> {name(c)}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/markets" className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white hover:bg-black">
                      {t("market.title")} ›
                    </Link>
                  </li>
                </ul>
              </div>
            )}
            {enabled.has("suppliers") && (
              <div>
                <p className="eyebrow mb-2">{t("home.suppliers.eyebrow")}</p>
                <h2 className="text-[22px] font-bold text-ink md:text-[28px]">{t("home.suppliers.title")}</h2>
                {suppliers.length ? (
                  <div className="mt-5 grid gap-3">
                    {suppliers.map((s) => (
                      <SupplierCard key={s.id} s={s} t={t} />
                    ))}
                  </div>
                ) : (
                  <EmptyState compact className="mt-5" title={t("supplier.empty")} body={t("supplier.registerCta")} action={<Link href="/sell" className={buttonClass("outline", "md")}>{t("footer.registerSupplier")}</Link>} />
                )}
                <Link href="/suppliers" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-800 hover:text-brand-900">
                  {t("home.suppliers.all")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------ Browse by category (text) ------------------------------------------------ */}
        {enabled.has("browse_categories") && (
          <section className="border-t border-line py-10 md:py-14">
            <h2 className="text-[20px] font-bold text-ink md:text-[22px]">{t("home.browse.title")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-10 sm:gap-y-6 lg:grid-cols-4">
              {tree.map((c) => (
                <div key={c.id}>
                  <h3 className="text-[15px] font-bold">
                    <Link href={`/categories/${c.slug}`} className="hover:text-brand-800">
                      {name(c)}
                    </Link>
                  </h3>
                  <ul className="mt-2 hidden space-y-1 text-[14px] text-muted sm:block">
                    {c.children.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        <Link href={`/categories/${s.slug}`} className="hover:text-brand-800">
                          {name(s)}
                        </Link>
                      </li>
                    ))}
                    {c.children.length > 4 && (
                      <li>
                        <Link href={`/categories/${c.slug}`} className="font-semibold text-brand-800">
                          +{c.children.length - 4} {t("common.seeMore").toLowerCase()}
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------------------------ Guides ------------------------------------------------ */}
        {enabled.has("guides") && guides.length > 0 && (
          <Section eyebrow={t("nav.guides")} title={t("home.guides.title")} action={{ href: "/guides", label: t("home.guides.all") }}>
            <div className="grid gap-4 md:grid-cols-3">
              {guides.map((g, i) => (
                <article key={g.slug} className={`panel ${["panel-sand", "panel-sky", "panel-rose"][i % 3]} flex flex-col`}>
                  <h3 className="text-[19px] font-bold leading-snug text-ink">
                    <Link href={`/guides/${g.slug}`} className="hover:text-brand-800">
                      {locale === "ur" && g.titleUr ? g.titleUr : g.titleEn}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn}</p>
                  <Link href={`/guides/${g.slug}`} className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-brand-800">
                    {t("common.seeMore")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
          </Section>
        )}

        {/* ------------------------------------------------ Totals ------------------------------------------------ */}
        <section className="border-t border-line py-8">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { v: totals.commodities, l: t("home.stats.commodities") },
              { v: totals.cities, l: t("home.stats.cities") },
              { v: totals.suppliers, l: t("home.stats.suppliers") },
              { v: totals.rates, l: t("home.stats.rates") },
            ].map((s) => (
              <div key={s.l}>
                <dt className="text-[13px] font-medium text-muted">{s.l}</dt>
                <dd className="text-[28px] font-extrabold tracking-tight text-ink num">{formatNumber(s.v)}</dd>
              </div>
            ))}
          </dl>
          <p className="sr-only">{brand.tagline}</p>
        </section>
      </div>
    </div>
  );
}
