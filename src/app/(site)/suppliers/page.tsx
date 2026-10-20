import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { loadSupplierDirectory } from "@/lib/data/supplier-page";
import { getSupplierCountByCity } from "@/lib/data/suppliers";
import { getMajorCities } from "@/lib/data/locations";
import { lname, pageHref, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { SupplierDirectory } from "@/components/marketplace/supplier-directory";
import { Chip, ChipRow } from "@/components/public/chip";
import { VerificationLabel } from "@/components/marketplace/cards";
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
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink";
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("supplier.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }])} />
      <PageHeader eyebrow={t("common.suppliers")} title={t("supplier.title")} subtitle={t("supplier.sub")}>
        <ChipRow className="mt-5" scroll>
          {major.map((c) => (
            <li key={c.id}>
              <Chip href={`/suppliers/${c.slug}`} size="sm" count={counts.get(c.id) ?? 0}>
                {lname(locale, c)}
              </Chip>
            </li>
          ))}
        </ChipRow>
      </PageHeader>
      <SupplierDirectory t={t} action="/suppliers" values={values} cities={cityOptions} commodities={commodityOptions} result={result} hrefFor={(p) => pageHref("/suppliers", sp, p)} />
      <aside className="mt-12 rounded-[var(--r-xl)] bg-tint-sky p-6 md:p-8">
        <p className="eyebrow">{t("browse.verifiedWhat")}</p>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-2">{t("browse.verificationExplain", { brand })}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {["none", "phone_verified", "documents_reviewed", "admin_verified"].map((l) => (
            <li key={l}>
              <VerificationLabel level={l} t={t} />
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
