import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getGuides } from "@/lib/data/content";
import { formatDate } from "@/lib/utils/format";
import { type SP, s } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/guides", title: "Market Guides — Buying and Selling Commodities in Pakistan", description: "Practical guides on commodity trading in Pakistan: units like maund, verifying suppliers, understanding market rates, and buying specific commodities." });
}

export default async function GuidesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const page = Math.max(1, parseInt(s(sp, "page") || "1", 10) || 1);
  const res = await getGuides(page, 12);
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("guide.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("guide.title"), path: "/guides" }])} />
      <PageHeader title={t("guide.title")} subtitle={t("guide.sub")} />
      {res.items.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {res.items.map((g) => (
              <article key={g.id} className="card flex flex-col p-5">
                <h2 className="text-lg font-bold">
                  <Link href={`/guides/${g.slug}`} className="hover:text-primary">
                    {locale === "ur" && g.titleUr ? g.titleUr : g.titleEn}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-3 text-text-muted">{locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn}</p>
                <p className="mt-auto pt-3 text-sm text-text-muted num">{g.publishedAt ? formatDate(g.publishedAt, locale) : ""}</p>
              </article>
            ))}
          </div>
          <Pagination page={res.page} totalPages={res.totalPages} hrefFor={(p) => (p > 1 ? `/guides?page=${p}` : "/guides")} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState icon="📚" title={t("empty.generic")} body={t("empty.hint")} />
      )}
    </div>
  );
}
