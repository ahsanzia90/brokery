import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getGuides } from "@/lib/data/content";
import { type SP, s } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { GuideCard } from "@/components/public/guide-card";
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
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("guide.title") }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("guide.title"), path: "/guides" }])} />
      <PageHeader eyebrow={t("nav.guides")} title={t("guide.title")} subtitle={t("guide.sub")} />
      {res.items.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {res.items.map((g, i) => (
              <GuideCard key={g.id} g={g} locale={locale} index={i} moreLabel={t("browse.readMore")} />
            ))}
          </div>
          <Pagination page={res.page} totalPages={res.totalPages} hrefFor={(p) => (p > 1 ? `/guides?page=${p}` : "/guides")} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("empty.generic")} body={t("empty.hint")} />
      )}
    </div>
  );
}
