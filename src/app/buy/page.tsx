import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPopularCommodities, getCategoryTree } from "@/lib/data/taxonomy";
import { getMajorCities } from "@/lib/data/locations";
import { lname } from "@/lib/data/browse-helpers";
import { SearchBar } from "@/components/layout/search-bar";
import { PageHeader, Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { CategoryCard } from "@/components/marketplace/cards";
import { StepPanel } from "@/components/public/steps";
import { Chip, ChipRow } from "@/components/public/chip";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/buy", title: "Buy Commodities in Pakistan — Find Suppliers and Rates", description: "Start here to buy: search a commodity, pick your city, compare supplier listings and published rates, then contact suppliers or post a buying request." });
}

export default async function BuyPage() {
  const { t, locale } = await getT();
  const [popular, cities, tree] = await Promise.all([getPopularCommodities(12), getMajorCities(), getCategoryTree()]);
  return (
    <div className="container-page py-6 md:py-10">
      <PageHeader eyebrow={t("home.buy.en")} title={t("browse.buyTitle")} subtitle={t("browse.buySub")} />
      <ol className="grid gap-4 md:grid-cols-2 md:gap-5">
        <StepPanel n={1} title={t("browse.stepSearch")} body={t("browse.buyStep1").replace(/^\d+\.\s*/, "")} className="md:col-span-2" tint="panel-mint">
          <SearchBar size="lg" autoFocus />
          <ChipRow className="mt-4" scroll>
            {popular.map((c) => (
              <li key={c.id}>
                <Chip href={`/commodities/${c.slug}`} size="sm" className="bg-white/80">
                  {lname(locale, c)}
                </Chip>
              </li>
            ))}
          </ChipRow>
        </StepPanel>
        <StepPanel n={2} title={t("browse.stepCity")} body={t("browse.buyStep2").replace(/^\d+\.\s*/, "")} tint="panel-sky">
          <ChipRow>
            {cities.map((c) => (
              <li key={c.id}>
                <Chip href={`/suppliers/${c.slug}`} size="sm" className="bg-white/80">
                  <MapPin className="h-3.5 w-3.5 text-muted-2" aria-hidden /> {lname(locale, c)}
                </Chip>
              </li>
            ))}
            <li>
              <Link href="/markets" className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-brand-800 underline underline-offset-4">
                {t("market.title")} ›
              </Link>
            </li>
          </ChipRow>
        </StepPanel>
        <StepPanel n={3} title={t("browse.stepContact")} body={t("browse.buyStep3").replace(/^\d+\.\s*/, "")} tint="panel-peach">
          <p className="text-[14px] text-ink-2">{t("browse.buyNoListing")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkButton href="/rfq/new" variant="primary" size="lg">
              {t("action.createRfq")}
            </LinkButton>
            <LinkButton href="/prices" variant="outline" size="lg" className="bg-white/70">
              {t("nav.prices")}
            </LinkButton>
          </div>
        </StepPanel>
      </ol>
      <Section eyebrow={t("home.categories.eyebrow")} title={t("home.browse.title")} action={{ href: "/categories", label: t("home.categories.all") }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {tree.slice(0, 8).map((c) => (
            <CategoryCard key={c.id} c={{ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr, icon: c.icon, imagePath: c.imagePath }} locale={locale} />
          ))}
        </div>
      </Section>
    </div>
  );
}
