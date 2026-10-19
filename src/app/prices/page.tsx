import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getSetting } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCitiesWithPrices, getCommoditiesWithPrices, getLatestPublishedPrices, type PriceType } from "@/lib/prices/queries";
import { PRICE_TYPES } from "@/lib/prices/service";
import { GroupedPriceList, PriceDisclaimer } from "@/components/prices/price-list";
import { PriceFilters } from "@/components/prices/filters";
import { getLocationBySlug } from "@/lib/data/locations";
import { getCommodityBySlug } from "@/lib/data/taxonomy";
import { qs } from "@/lib/admin/params";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({ path: "/prices", title: t("price.seo.index"), description: t("price.seo.indexDesc") });
}

export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const commodity = sp.commodity ? await getCommodityBySlug(sp.commodity) : null;
  const city = sp.city ? await getLocationBySlug("city", sp.city) : null;
  const type = sp.type && (PRICE_TYPES as readonly string[]).includes(sp.type) ? (sp.type as PriceType) : null;
  const filters = { commodityId: commodity?.id ?? null, locationId: city?.id ?? null, priceType: type };

  const [commodities, cities, fresh, older] = await Promise.all([
    getCommoditiesWithPrices(),
    getCitiesWithPrices(commodity?.id ?? null),
    getLatestPublishedPrices({ ...filters, page, pageSize: 40 }, locale, staleDays),
    getLatestPublishedPrices({ ...filters, onlyStale: true, page: 1, pageSize: 40 }, locale, staleDays),
  ]);
  const cityOpts = cities.filter((c) => c.type === "city");
  const hasFilters = Boolean(commodity || city || type);

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("price.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("price.title"), path: "/prices" }])} />
      <PageHeader title={t("price.title")} subtitle={t("price.sub")} />
      <PriceDisclaimer t={t} />
      <PriceFilters t={t} locale={locale} commodities={commodities} cities={cityOpts} priceTypes={[...PRICE_TYPES]} selected={{ commodity: sp.commodity, city: sp.city, type: sp.type }} />

      <section aria-labelledby="today">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today" className="text-xl font-bold">
            {t("price.todayRates")}
          </h2>
          {fresh.total > 0 && <span className="text-sm text-text-muted num">{t("price.rateCount", { count: fresh.total })}</span>}
        </div>
        {fresh.items.length ? (
          <>
            <GroupedPriceList items={fresh.items} t={t} locale={locale} staleDays={staleDays} />
            <Pagination page={fresh.page} totalPages={fresh.totalPages} hrefFor={(p) => qs("/prices", { commodity: sp.commodity, city: sp.city, type: sp.type, page: p })} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
          </>
        ) : (
          <EmptyState
            icon="📈"
            title={t("price.notAvailable")}
            body={hasFilters ? t("empty.hint") : t("home.prices.empty")}
            action={
              <>
                <Link href={commodity ? `/rfq/new?commodity=${commodity.slug}` : "/rfq/new"} className="font-semibold text-primary underline">
                  {t("price.requestQuote")}
                </Link>
                {commodity && (
                  <Link href={`/commodities/${commodity.slug}`} className="font-semibold text-primary underline">
                    {t("action.findSuppliers")}
                  </Link>
                )}
              </>
            }
          />
        )}
      </section>

      {older.items.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-xl font-bold">
            {t("price.olderRates")} <span className="text-base font-normal text-text-muted num">({older.total})</span>
          </summary>
          <p className="mb-4 mt-2 text-text-muted">{t("price.olderRatesNote", { days: staleDays })}</p>
          <GroupedPriceList items={older.items} t={t} locale={locale} staleDays={staleDays} />
        </details>
      )}

      {commodities.length > 0 && (
        <section className="mt-10" aria-labelledby="by-commodity">
          <h2 id="by-commodity" className="mb-3 text-xl font-bold">
            {t("price.byCommodity")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {commodities.map((c) => (
              <li key={c.id}>
                <Link href={`/prices/${c.slug}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                  {locale === "ur" && c.nameUr ? c.nameUr : c.nameEn} <span className="text-sm text-text-muted num">({c.n})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
