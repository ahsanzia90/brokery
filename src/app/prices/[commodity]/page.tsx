import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getSetting } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { getCommodityBySlug, getVarieties } from "@/lib/data/taxonomy";
import { getCitiesWithPrices, getLatestPublishedPrices, getPriceHistory } from "@/lib/prices/queries";
import { GroupedPriceList, HistoryTable, PriceDisclaimer } from "@/components/prices/price-list";
import { Select } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const commodity = await getCommodityBySlug(slug);
  if (!commodity || commodity.status !== "active") return null;
  return commodity;
}

export async function generateMetadata({ params }: { params: Promise<{ commodity: string }> }): Promise<Metadata> {
  const { commodity: slug } = await params;
  const commodity = await load(slug);
  if (!commodity) return { title: "Not found" };
  const { t, locale } = await getT();
  const name = locale === "ur" && commodity.nameUr ? commodity.nameUr : commodity.nameEn;
  const { total } = await getLatestPublishedPrices({ commodityId: commodity.id, includeStale: true, pageSize: 1 }, locale, 7);
  return buildMetadata({
    path: `/prices/${commodity.slug}`,
    title: t("price.seo.commodity", { name: commodity.nameEn }),
    description: t("price.seo.commodityDesc", { name: name }),
    entity: { type: "price_commodity", id: commodity.id },
    noindex: total === 0,
  });
}

export default async function CommodityPricesPage({ params, searchParams }: { params: Promise<{ commodity: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { commodity: slug } = await params;
  const sp = await searchParams;
  const commodity = await load(slug);
  if (!commodity) notFound();
  const { t, locale } = await getT();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const name = locale === "ur" && commodity.nameUr ? commodity.nameUr : commodity.nameEn;
  const varieties = commodity.supportsVarieties ? await getVarieties(commodity.id) : [];
  const variety = sp.variety ? varieties.find((v) => v.slug === sp.variety) ?? null : null;

  const [fresh, older, history, cities] = await Promise.all([
    getLatestPublishedPrices({ commodityId: commodity.id, varietyId: variety?.id ?? null, pageSize: 100 }, locale, staleDays),
    getLatestPublishedPrices({ commodityId: commodity.id, varietyId: variety?.id ?? null, onlyStale: true, pageSize: 100 }, locale, staleDays),
    getPriceHistory({ commodityId: commodity.id, varietyId: variety?.id ?? null }, locale, staleDays, 30),
    getCitiesWithPrices(commodity.id),
  ]);
  const crumbs = [
    { name: t("common.home"), path: "/" },
    { name: t("price.title"), path: "/prices" },
    { name: name, path: `/prices/${commodity.slug}` },
  ];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("price.title"), href: "/prices" }, { label: name }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageHeader title={t("price.inPakistan", { name })} subtitle={t("price.sub")}>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href={`/commodities/${commodity.slug}`} variant="primary">
            {t("price.findSuppliersFor", { name })}
          </LinkButton>
          <LinkButton href={`/rfq/new?commodity=${commodity.slug}`} variant="outline">
            {t("price.requestQuoteFor", { name })}
          </LinkButton>
        </div>
      </PageHeader>
      <PriceDisclaimer t={t} />

      {varieties.length > 0 && (
        <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
          <label className="block min-w-[220px]">
            <span className="mb-1 block text-sm font-semibold">{t("common.variety")}</span>
            <Select name="variety" defaultValue={sp.variety ?? ""}>
              <option value="">{t("common.all")}</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.slug}>
                  {locale === "ur" && v.nameUr ? v.nameUr : v.nameEn}
                </option>
              ))}
            </Select>
          </label>
          <button type="submit" className={buttonClass("outline", "md")}>
            {t("action.apply")}
          </button>
        </form>
      )}

      <section aria-labelledby="by-city">
        <h2 id="by-city" className="mb-3 text-xl font-bold">
          {t("price.byCity")}
        </h2>
        {fresh.items.length ? (
          <GroupedPriceList items={fresh.items} t={t} locale={locale} staleDays={staleDays} />
        ) : (
          <EmptyState icon="📈" title={t("price.noRatesFor", { name })} body={t("price.noRatesHint")} action={<Link href={`/rfq/new?commodity=${commodity.slug}`} className="font-semibold text-primary underline">{t("price.requestQuote")}</Link>} />
        )}
      </section>

      {older.items.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xl font-bold">
            {t("price.olderRates")} <span className="text-base font-normal text-text-muted num">({older.total})</span>
          </summary>
          <p className="mb-4 mt-2 text-text-muted">{t("price.olderRatesNote", { days: staleDays })}</p>
          <GroupedPriceList items={older.items} t={t} locale={locale} staleDays={staleDays} />
        </details>
      )}

      {cities.filter((c) => c.type === "city").length > 0 && (
        <section className="mt-8" aria-labelledby="cities">
          <h2 id="cities" className="mb-3 text-lg font-bold">
            {t("price.byCity")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {cities
              .filter((c) => c.type === "city")
              .map((c) => (
                <li key={c.id}>
                  <Link href={`/prices/${commodity.slug}/${c.slug}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                    {locale === "ur" && c.nameUr ? c.nameUr : c.nameEn}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-10" aria-labelledby="history">
          <h2 id="history" className="mb-1 text-xl font-bold">
            {t("price.history")}
          </h2>
          <p className="mb-3 text-sm text-text-muted">{t("price.recentNote", { n: history.length })}</p>
          <HistoryTable rows={history} t={t} locale={locale} />
        </section>
      )}
    </div>
  );
}
