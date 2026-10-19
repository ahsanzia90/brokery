import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { loadSupplierDirectory } from "@/lib/data/supplier-page";
import { getSupplierCountByCity } from "@/lib/data/suppliers";
import { getMajorCities } from "@/lib/data/locations";
import { lname, pageHref, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { SupplierDirectory } from "@/components/marketplace/supplier-directory";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { searchParams: Promise<SP> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).some((k) => k !== "page");
  return buildMetadata({ path: "/suppliers", title: "Commodity Suppliers Directory — Pakistan", description: "Find commodity suppliers, traders, mills and manufacturers across Pakistan. Filter by city, commodity and verification status, then contact them directly.", noindex: hasFilters });
}

export default async function SuppliersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [{ result, cityOptions, commodityOptions, values }, counts, major] = await Promise.all([loadSupplierDirectory(sp, locale), getSupplierCountByCity(), getMajorCities()]);
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("supplier.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }])} />
      <PageHeader title={t("supplier.title")} subtitle={t("supplier.sub")}>
        <ul className="mt-3 flex flex-wrap gap-2">
          {major.map((c) => (
            <li key={c.id}>
              <Link href={`/suppliers/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                {lname(locale, c)}
                {counts.get(c.id) ? <span className="ms-1 text-text-muted num">({counts.get(c.id)})</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </PageHeader>
      <SupplierDirectory t={t} action="/suppliers" values={values} cities={cityOptions} commodities={commodityOptions} result={result} hrefFor={(p) => pageHref("/suppliers", sp, p)} />
      <p className="mt-6 text-sm text-text-muted">{t("browse.verificationExplain", { brand: process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink" })}</p>
    </div>
  );
}
