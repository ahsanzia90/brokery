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
import { getCommodityBySlug } from "@/lib/data/taxonomy";
import { getLocationBySlug } from "@/lib/data/locations";
import { getLatestPublishedPrices, getPriceHistory } from "@/lib/prices/queries";
import { GroupedPriceList, HistoryTable, PriceDisclaimer } from "@/components/prices/price-list";

export const dynamic = "force-dynamic";

async function load(slug: string, citySlug: string) {
  const commodity = await getCommodityBySlug(slug);
  if (!commodity || commodity.status !== "active") return null;
  const city = (await getLocationBySlug("city", citySlug)) ?? (await getLocationBySlug("market", citySlug));
  if (!city) return null;
  return { commodity, city };
}

export async function generateMetadata({ params }: { params: Promise<{ commodity: string; city: string }> }): Promise<Metadata> {
  const p = await params;
  const data = await load(p.commodity, p.city);
  if (!data) return { title: "Not found" };
  const { t, locale } = await getT();
  const { total } = await getLatestPublishedPrices({ commodityId: data.commodity.id, locationId: data.city.id, includeStale: true, pageSize: 1 }, locale, 7);
  return buildMetadata({
    path: `/prices/${data.commodity.slug}/${data.city.slug}`,
    title: t("price.seo.city", { name: data.commodity.nameEn, city: data.city.nameEn }),
    description: t("price.seo.cityDesc", { name: data.commodity.nameEn, city: data.city.nameEn }),
    noindex: total === 0,
  });
}

export default async function CommodityCityPricesPage({ params }: { params: Promise<{ commodity: string; city: string }> }) {
  const p = await params;
  const data = await load(p.commodity, p.city);
  if (!data) notFound();
  const { commodity, city } = data;
  const { t, locale } = await getT();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const name = locale === "ur" && commodity.nameUr ? commodity.nameUr : commodity.nameEn;
  const cityName = locale === "ur" && city.nameUr ? city.nameUr : city.nameEn;
  const [fresh, older, history] = await Promise.all([
    getLatestPublishedPrices({ commodityId: commodity.id, locationId: city.id, pageSize: 100 }, locale, staleDays),
    getLatestPublishedPrices({ commodityId: commodity.id, locationId: city.id, onlyStale: true, pageSize: 100 }, locale, staleDays),
    getPriceHistory({ commodityId: commodity.id, locationId: city.id }, locale, staleDays, 30),
  ]);
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("price.title"), href: "/prices" }, { label: name, href: `/prices/${commodity.slug}` }, { label: cityName }]} homeLabel={t("common.home")} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("common.home"), path: "/" },
          { name: t("price.title"), path: "/prices" },
          { name, path: `/prices/${commodity.slug}` },
          { name: cityName, path: `/prices/${commodity.slug}/${city.slug}` },
        ])}
      />
      <PageHeader title={t("price.inCity", { name, city: cityName })} subtitle={t("price.sub")}>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href={`/commodities/${commodity.slug}/city/${city.slug}`} variant="primary">
            {t("price.findSuppliersFor", { name })}
          </LinkButton>
          <LinkButton href={`/rfq/new?commodity=${commodity.slug}&city=${city.slug}`} variant="outline">
            {t("price.requestQuoteFor", { name })}
          </LinkButton>
        </div>
      </PageHeader>
      <PriceDisclaimer t={t} />
      {fresh.items.length ? (
        <GroupedPriceList items={fresh.items} t={t} locale={locale} staleDays={staleDays} />
      ) : (
        <EmptyState icon="📈" title={t("price.noRatesFor", { name: `${name} (${cityName})` })} body={t("price.noRatesHint")} action={<Link href={`/rfq/new?commodity=${commodity.slug}&city=${city.slug}`} className="font-semibold text-primary underline">{t("price.requestQuote")}</Link>} />
      )}
      {older.items.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xl font-bold">{t("price.olderRates")}</summary>
          <p className="mb-4 mt-2 text-text-muted">{t("price.olderRatesNote", { days: staleDays })}</p>
          <GroupedPriceList items={older.items} t={t} locale={locale} staleDays={staleDays} />
        </details>
      )}
      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-xl font-bold">{t("price.history")}</h2>
          <p className="mb-3 text-sm text-text-muted">{t("price.recentNote", { n: history.length })}</p>
          <HistoryTable rows={history} t={t} locale={locale} />
        </section>
      )}
      <p className="mt-8">
        <Link href={`/prices/${commodity.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">
          ‹ {t("price.inPakistan", { name })}
        </Link>
      </p>
    </div>
  );
}
