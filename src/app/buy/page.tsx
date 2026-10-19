import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPopularCommodities, getCategoryTree } from "@/lib/data/taxonomy";
import { getMajorCities } from "@/lib/data/locations";
import { lname } from "@/lib/data/browse-helpers";
import { SearchBar } from "@/components/layout/search-bar";
import { PageHeader, Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { CategoryCard } from "@/components/marketplace/cards";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/buy", title: "Buy Commodities in Pakistan — Find Suppliers and Rates", description: "Start here to buy: search a commodity, pick your city, compare supplier listings and published rates, then contact suppliers or post a buying request." });
}

export default async function BuyPage() {
  const { t, locale } = await getT();
  const [popular, cities, tree] = await Promise.all([getPopularCommodities(12), getMajorCities(), getCategoryTree()]);
  return (
    <div className="container-page py-6">
      <PageHeader title={t("browse.buyTitle")} subtitle={t("browse.buySub")} />
      <ol className="grid gap-4 md:grid-cols-3">
        <li className="card p-5 md:col-span-3">
          <h2 className="mb-2 text-lg font-bold">{t("browse.buyStep1")}</h2>
          <SearchBar size="lg" autoFocus />
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("search.popular")}>
            {popular.map((c) => (
              <li key={c.id}>
                <Link href={`/commodities/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                  {lname(locale, c)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li className="card p-5 md:col-span-2">
          <h2 className="mb-2 text-lg font-bold">{t("browse.buyStep2")}</h2>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={`/suppliers/${c.slug}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                  {lname(locale, c)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/markets" className="inline-block min-h-[44px] px-2 py-2 font-semibold text-primary underline">
                {t("market.title")} ›
              </Link>
            </li>
          </ul>
        </li>
        <li className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold">{t("browse.buyStep3")}</h2>
          <p className="text-text-muted">{t("home.how.2.body")}</p>
          <p className="text-text-muted">{t("browse.buyNoListing")}</p>
          <LinkButton href="/rfq/new" variant="primary" size="lg">
            {t("action.createRfq")}
          </LinkButton>
          <LinkButton href="/prices" variant="outline">
            {t("nav.prices")}
          </LinkButton>
        </li>
      </ol>
      <Section title={t("home.browse.title")} action={{ href: "/categories", label: t("home.categories.all") }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tree.map((c) => (
            <CategoryCard key={c.id} c={{ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr, icon: c.icon, imagePath: c.imagePath }} locale={locale} />
          ))}
        </div>
      </Section>
    </div>
  );
}
