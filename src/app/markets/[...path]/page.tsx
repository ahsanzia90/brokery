import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllLocations, getLocationByPath, resolveLocationChain } from "@/lib/data/locations";
import { searchListings } from "@/lib/data/listings";
import { searchSuppliers } from "@/lib/data/suppliers";
import { getLatestPublishedRates } from "@/lib/data/rates-summary";
import { getSetting } from "@/lib/config/settings";
import { lname, pageHref, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, Section } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import { PriceRow, SupplierCard } from "@/components/marketplace/cards";
import { ListingResults } from "@/components/marketplace/listing-results";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<SP> };

async function descendantIds(id: string): Promise<string[]> {
  const all = await getAllLocations();
  const out = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const l of all) if (l.parentId === cur) {
      out.push(l.id);
      stack.push(l.id);
    }
  }
  return out;
}

async function load(pathParts: string[], locale: "en" | "ur") {
  const loc = await getLocationByPath(pathParts.join("/"));
  if (!loc) return null;
  const ids = await descendantIds(loc.id);
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const filter = loc.type === "province" ? { provinceId: loc.id } : { cityId: loc.id };
  const supFilter = loc.type === "province" ? { provinceId: loc.id } : { cityId: loc.id };
  const [listings, suppliers, rates] = await Promise.all([searchListings({ ...filter, pageSize: 9 }, locale), searchSuppliers({ ...supFilter, pageSize: 6 }, locale), getLatestPublishedRates({ locationIds: ids, limit: 10 }, locale, staleDays)]);
  return { loc, listings, suppliers, rates, staleDays };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const data = await load(path, "en");
  if (!data) return { title: "Not found" };
  const kind = data.loc.type === "market" ? "Mandi" : data.loc.type === "province" ? "Province" : "City";
  return buildMetadata({
    path: `/markets/${data.loc.path}`,
    entity: { type: "location", id: data.loc.id },
    title: `${data.loc.nameEn} ${kind}: Commodity Suppliers, Listings and Rates`,
    description: `Suppliers, published listings and market rates in ${data.loc.nameEn}, Pakistan. Find commodities and contact suppliers directly.`,
    noindex: data.listings.total === 0 && data.suppliers.total === 0 && data.rates.length === 0,
  });
}

export default async function MarketPage({ params, searchParams }: Props) {
  const { path } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const data = await load(path, locale);
  if (!data) return redirectOr404();
  const { loc, listings, suppliers, rates, staleDays } = data;
  const chain = await resolveLocationChain(loc.id);
  const all = await getAllLocations();
  const children = all.filter((l) => l.parentId === loc.id && l.type !== "district");
  const districtChildren = all.filter((l) => l.parentId === loc.id && l.type === "district").flatMap((d) => all.filter((c) => c.parentId === d.id));
  const sub = [...children, ...districtChildren];
  const name = lname(locale, loc);
  const base = `/markets/${loc.path}`;
  const crumbs = [chain.province, chain.city, chain.market].filter((x): x is NonNullable<typeof x> => Boolean(x) && x!.id !== loc.id).map((x) => ({ label: lname(locale, x), href: `/markets/${x.path}` }));
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("market.title"), href: "/markets" }, ...crumbs, { label: name }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("market.title"), path: "/markets" }, ...crumbs.map((c) => ({ name: c.label, path: c.href })), { name, path: base }])} />
      <PageHeader title={name} subtitle={t("market.sub")}>
        <div className="mt-3 flex flex-wrap gap-3">
          {loc.type === "city" && (
            <LinkButton href={`/suppliers/${loc.slug}`} variant="primary">
              {t("supplier.inCity", { city: name })}
            </LinkButton>
          )}
          <LinkButton href={`/rfq/new${loc.type === "city" ? `?city=${loc.slug}` : ""}`} variant="outline">
            {t("action.createRfq")}
          </LinkButton>
        </div>
      </PageHeader>
      {sub.length > 0 && (
        <Section title={loc.type === "city" ? t("browse.marketsIn", { city: name }) : t("common.city")}>
          <ul className="flex flex-wrap gap-2">
            {sub.map((c) => (
              <li key={c.id}>
                <Link href={`/markets/${c.path}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                  {lname(locale, c)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {rates.length > 0 && (
        <Section title={t("browse.ratesIn", { name })} subtitle={t("price.disclaimer")}>
          <div className="grid gap-3 md:grid-cols-2">
            {rates.map((p) => (
              <PriceRow key={p.id} p={p} t={t} locale={locale} staleDays={staleDays} />
            ))}
          </div>
        </Section>
      )}
      <Section title={t("browse.listingsIn", { name })}>
        <ListingResults t={t} result={listings} hrefFor={(p) => pageHref(base, sp, p)} emptyAction={<LinkButton href="/rfq/new" variant="primary">{t("action.createRfq")}</LinkButton>} />
      </Section>
      {suppliers.items.length > 0 && (
        <Section title={t("common.suppliers")} action={loc.type === "city" ? { href: `/suppliers/${loc.slug}`, label: t("action.viewAll") } : undefined}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
