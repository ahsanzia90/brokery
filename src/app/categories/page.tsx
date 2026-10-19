import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCategoryTree } from "@/lib/data/taxonomy";
import { getListingCountsByCategory } from "@/lib/data/home";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { lname } from "@/lib/data/browse-helpers";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/categories", title: "Browse Commodity Categories in Pakistan", description: "All commodity categories on the marketplace: grains, fruits and vegetables, construction materials, metals, fertilizers, textiles, plastics, scrap and more." });
}

export default async function CategoriesPage() {
  const { t, locale } = await getT();
  const [tree, counts] = await Promise.all([getCategoryTree(), getListingCountsByCategory()]);
  const countFor = (c: { id: string }): number => counts.get(c.id) ?? 0;
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("category.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }])} />
      <PageHeader title={t("category.title")} subtitle={t("category.sub")} />
      <div className="grid gap-5 md:grid-cols-2">
        {tree.map((c) => {
          const n = countFor(c) + c.children.reduce((a, ch) => a + (counts.get(ch.id) ?? 0), 0);
          return (
            <section key={c.id} className="card p-5">
              <h2 className="text-xl font-bold">
                <Link href={`/categories/${c.slug}`} className="hover:text-primary">
                  {c.icon ? <span aria-hidden>{c.icon} </span> : null}
                  {lname(locale, c)}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {t("browse.subcategoryCount", { count: c.children.length })}
                {n > 0 ? ` · ${t("browse.listingsCount", { count: n })}` : ""}
              </p>
              {c.description && <p className="mt-2 line-clamp-2 text-text-muted">{locale === "ur" && c.descriptionUr ? c.descriptionUr : c.description}</p>}
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.children.map((s) => (
                  <li key={s.id}>
                    <Link href={`/categories/${s.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 text-[0.95rem] hover:border-primary hover:text-primary">
                      {lname(locale, s)}
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
