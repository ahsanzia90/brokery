import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCategoryTree, getCommoditiesInCategory } from "@/lib/data/taxonomy";
import { getListingCountsByCategory } from "@/lib/data/home";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { lname } from "@/lib/data/browse-helpers";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { Chip } from "@/components/public/chip";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/categories", title: "Browse Commodity Categories in Pakistan", description: "All commodity categories on the marketplace: grains, fruits and vegetables, construction materials, metals, fertilizers, textiles, plastics, scrap and more." });
}

export default async function CategoriesPage() {
  const { t, locale } = await getT();
  const [tree, counts] = await Promise.all([getCategoryTree(), getListingCountsByCategory()]);
  const countFor = (c: { id: string }): number => counts.get(c.id) ?? 0;
  // Leaf categories (no subcategories) show their first commodities instead.
  const leafCommodities = new Map(await Promise.all(tree.filter((c) => c.children.length === 0).map(async (c) => [c.id, (await getCommoditiesInCategory(c.id, false)).slice(0, 6)] as const)));
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("category.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }])} />
      <PageHeader eyebrow={t("home.categories.eyebrow")} title={t("category.title")} subtitle={t("category.sub")} />
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {tree.map((c) => {
          const n = countFor(c) + c.children.reduce((a, ch) => a + (counts.get(ch.id) ?? 0), 0);
          const key = artKeyFor(c.slug, c.nameEn);
          return (
            <section key={c.id} className="flex gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 md:p-5">
              <Link href={`/categories/${c.slug}`} className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-md)] ${c.imagePath ? "" : artTint[key]}`}>
                {c.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/files/public/${c.imagePath}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <CommodityArt artKey={key} className="h-14 w-14" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold leading-tight text-ink">
                  <Link href={`/categories/${c.slug}`} className="hover:text-brand-800">
                    {lname(locale, c)}
                  </Link>
                </h2>
                <p className="mt-0.5 text-[13px] text-muted num">
                  {c.children.length > 0 ? t("browse.subcategoryCount", { count: c.children.length }) : t("browse.commoditiesCount", { count: (leafCommodities.get(c.id) ?? []).length })}
                  {n > 0 ? ` · ${t("browse.listingsCount", { count: n })}` : ""}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.children.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Chip href={`/categories/${s.slug}`} size="sm">
                        {lname(locale, s)}
                      </Chip>
                    </li>
                  ))}
                  {c.children.length === 0 &&
                    (leafCommodities.get(c.id) ?? []).map((cm) => (
                      <li key={cm.id}>
                        <Chip href={`/commodities/${cm.slug}`} size="sm">
                          {lname(locale, cm)}
                        </Chip>
                      </li>
                    ))}
                  {c.children.length > 6 && (
                    <li>
                      <Link href={`/categories/${c.slug}`} className="inline-flex h-9 items-center gap-1 px-2 text-[13px] font-semibold text-brand-800">
                        +{c.children.length - 6} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
