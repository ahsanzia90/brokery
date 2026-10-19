import type { Metadata } from "next";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { commodities } from "@/db/schema";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getGuideBySlug, getGuides } from "@/lib/data/content";
import { markdownExcerpt, renderMarkdown } from "@/lib/content/markdown";
import { formatDate } from "@/lib/utils/format";
import { lname } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuideBySlug(slug);
  if (!g) return { title: "Not found" };
  return buildMetadata({ path: `/guides/${g.slug}`, entity: { type: "content", id: g.id }, title: g.titleEn, description: g.excerptEn || markdownExcerpt(g.bodyEn), type: "article", publishedTime: g.publishedAt?.toISOString(), image: g.coverImagePath ? `/files/public/${g.coverImagePath}` : null });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const { t, locale } = await getT();
  const g = await getGuideBySlug(slug);
  if (!g) return redirectOr404();
  const title = locale === "ur" && g.titleUr ? g.titleUr : g.titleEn;
  const body = locale === "ur" && g.bodyUr ? g.bodyUr : g.bodyEn;
  const related = g.relatedCommodityIds.length ? await db.select().from(commodities).where(inArray(commodities.id, g.relatedCommodityIds)) : [];
  const others = (await getGuides(1, 4)).items.filter((o) => o.id !== g.id).slice(0, 3);
  const path = `/guides/${g.slug}`;
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("guide.title"), href: "/guides" }, { label: title }]} homeLabel={t("common.home")} />
      <JsonLd data={[breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("guide.title"), path: "/guides" }, { name: g.titleEn, path }]), articleJsonLd({ title: g.titleEn, description: g.excerptEn, path, publishedAt: g.publishedAt, updatedAt: g.updatedAt, image: g.coverImagePath ? `/files/public/${g.coverImagePath}` : null })]} />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {g.publishedAt && (
          <p className="mt-2 text-sm text-text-muted">
            {t("price.published")}: <span className="num">{formatDate(g.publishedAt, locale)}</span>
            {g.updatedAt && g.updatedAt > g.publishedAt ? ` · ${t("common.updated")}: ${formatDate(g.updatedAt, locale)}` : ""}
          </p>
        )}
        {g.coverImagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${g.coverImagePath}`} alt="" className="mt-4 w-full rounded-[var(--radius-lg)] border border-border" />
        )}
        <div className="prose-simple mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        {related.length > 0 && (
          <Section title={t("category.related")}>
            <ul className="flex flex-wrap gap-2">
              {related.map((c) => (
                <li key={c.id}>
                  <Link href={`/commodities/${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                    {lname(locale, c)}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {others.length > 0 && (
          <Section title={t("guide.related")}>
            <ul className="grid gap-3 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.id} className="card p-4">
                  <Link href={`/guides/${o.slug}`} className="font-bold hover:text-primary">
                    {locale === "ur" && o.titleUr ? o.titleUr : o.titleEn}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>
    </div>
  );
}
