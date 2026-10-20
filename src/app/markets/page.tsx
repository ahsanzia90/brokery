import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllLocations } from "@/lib/data/locations";
import { getSupplierCountByCity } from "@/lib/data/suppliers";
import { lname } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { Chip, ChipRow } from "@/components/public/chip";
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
  const TINTS = ["panel-mint", "panel-sand", "panel-sky", "panel-peach", "panel-lavender", "panel-rose", "panel-mint"];
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("market.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("market.title"), path: "/markets" }])} />
      <PageHeader eyebrow={t("common.location")} title={t("market.title")} subtitle={t("browse.marketsIntro")} />

      <section className="mb-10">
        <h2 className="mb-3 text-[18px] font-bold text-ink">{t("browse.majorMarkets")}</h2>
        <ChipRow>
          {major.map((c) => (
            <li key={c.id}>
              <Chip href={`/markets/${c.path}`} count={counts.get(c.id) ?? 0}>
                <MapPin className="h-3.5 w-3.5 text-muted-2" aria-hidden /> {lname(locale, c)}
              </Chip>
            </li>
          ))}
        </ChipRow>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {provinces.map((p, i) => {
          const pc = cities.filter((c) => cityProvince(c)?.id === p.id);
          return (
            <section key={p.id} className={`panel ${TINTS[i % TINTS.length]}`}>
              <h2 className="text-[20px] font-bold text-ink">
                <Link href={`/markets/${p.path}`} className="hover:text-brand-800">
                  {lname(locale, p)}
                </Link>
                <span className="ms-2 text-[14px] font-medium text-muted num">{t("browse.cityCount", { count: pc.length })}</span>
              </h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]">
                {pc.map((c) => (
                  <li key={c.id}>
                    <Link href={`/markets/${c.path}`} className={`${c.isMajorMarket ? "font-semibold text-ink" : "text-ink-2"} hover:text-brand-800 hover:underline underline-offset-4`}>
                      {lname(locale, c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
