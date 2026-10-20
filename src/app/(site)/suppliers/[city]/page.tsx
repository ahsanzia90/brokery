import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLocationBySlug, getMajorCities } from "@/lib/data/locations";
import { loadSupplierDirectory } from "@/lib/data/supplier-page";
import { searchSuppliers } from "@/lib/data/suppliers";
import { lname, pageHref, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { SupplierDirectory } from "@/components/marketplace/supplier-directory";
import { Chip, ChipRow } from "@/components/public/chip";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city } = await params;
  const sp = await searchParams;
  const loc = await getLocationBySlug("city", city);
  if (!loc) return { title: "Not found" };
  const { total } = await searchSuppliers({ cityId: loc.id, pageSize: 1 }, "en");
  const hasFilters = Object.keys(sp).some((k) => k !== "page");
  return buildMetadata({
    path: `/suppliers/${loc.slug}`,
    entity: { type: "location", id: loc.id },
    title: `Commodity Suppliers in ${loc.nameEn}`,
    description: `Suppliers, traders and mills in ${loc.nameEn}, Pakistan. Browse what they supply, check verification labels and contact them directly.`,
    noindex: total === 0 || hasFilters,
  });
}

export default async function SuppliersCityPage({ params, searchParams }: Props) {
  const { city } = await params;
  const sp = await searchParams;
  const loc = await getLocationBySlug("city", city);
  if (!loc) return redirectOr404();
  const { t, locale } = await getT();
  const [{ result, cityOptions, commodityOptions, values }, major] = await Promise.all([loadSupplierDirectory(sp, locale, loc.id), getMajorCities()]);
  const cityName = lname(locale, loc);
  const base = `/suppliers/${loc.slug}`;
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("supplier.title"), href: "/suppliers" }, { label: cityName }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }, { name: cityName, path: base }])} />
      <PageHeader eyebrow={t("browse.heroEyebrow.city")} title={t("supplier.inCity", { city: cityName })} subtitle={t("supplier.sub")}>
        <ChipRow className="mt-5" scroll>
          <li>
            <Chip href="/suppliers" size="sm">
              {t("common.all")}
            </Chip>
          </li>
          {major.map((c) => (
            <li key={c.id}>
              <Chip href={`/suppliers/${c.slug}`} size="sm" active={c.id === loc.id}>
                {lname(locale, c)}
              </Chip>
            </li>
          ))}
        </ChipRow>
      </PageHeader>
      <SupplierDirectory t={t} action={base} values={values} cities={cityOptions} commodities={commodityOptions} result={result} hrefFor={(p) => pageHref(base, sp, p)} hideCity emptyBody={t("browse.noSuppliersCity")} />
    </div>
  );
}
