import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllLocations } from "@/lib/data/locations";
import { getSupplierCountByCity } from "@/lib/data/suppliers";
import { lname } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, Section } from "@/components/ui/section";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/markets", title: "Markets and Cities — Commodity Suppliers by Location", description: "Browse commodity suppliers, listings and published rates by province, city and mandi across Pakistan." });
}

export default async function MarketsPage() {
  const { t, locale } = await getT();
  const [all, counts] = await Promise.all([getAllLocations(), getSupplierCountByCity()]);
  const byId = new Map(all.map((l) => [l.id, l]));
  const provinces = all.filter((l) => l.type === "province");
  const cityProvince = (c: (typeof all)[number]) => {
    const d = c.parentId ? byId.get(c.parentId) : null;
    return d?.type === "province" ? d : d?.parentId ? byId.get(d.parentId) : null;
  };
  const cities = all.filter((l) => l.type === "city");
  const major = cities.filter((c) => c.isMajorMarket);
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("market.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("market.title"), path: "/markets" }])} />
      <PageHeader title={t("market.title")} subtitle={t("browse.marketsIntro")} />
      <Section title={t("browse.majorMarkets")}>
        <ul className="flex flex-wrap gap-2">
          {major.map((c) => (
            <li key={c.id}>
              <Link href={`/markets/${c.path}`} className="inline-block min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 font-medium hover:border-primary hover:text-primary">
                {lname(locale, c)}
                {counts.get(c.id) ? <span className="ms-1 text-sm text-text-muted num">({counts.get(c.id)})</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      {provinces.map((p) => {
        const pc = cities.filter((c) => cityProvince(c)?.id === p.id);
        return (
          <Section key={p.id} title={<Link href={`/markets/${p.path}`} className="hover:text-primary">{lname(locale, p)}</Link>}>
            <ul className="flex flex-wrap gap-2">
              {pc.map((c) => (
                <li key={c.id}>
                  <Link href={`/markets/${c.path}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 text-[0.95rem] hover:border-primary hover:text-primary">
                    {lname(locale, c)}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
