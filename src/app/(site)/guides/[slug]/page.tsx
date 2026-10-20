import type { Metadata } from "next";
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
import { Chip, ChipRow } from "@/components/public/chip";
import { GuideCard } from "@/components/public/guide-card";
import { ArticleToc } from "@/components/public/toc";
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
  const excerpt = locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn;
  const related = g.relatedCommodityIds.length ? await db.select().from(commodities).where(inArray(commodities.id, g.relatedCommodityIds)) : [];
  const others = (await getGuides(1, 4)).items.filter((o) => o.id !== g.id).slice(0, 3);
  const path = `/guides/${g.slug}`;
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("guide.title"), href: "/guides" }, { label: title }]} homeLabel={t("common.home")} />
      <JsonLd data={[breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("guide.title"), path: "/guides" }, { name: g.titleEn, path }]), articleJsonLd({ title: g.titleEn, description: g.excerptEn, path, publishedAt: g.publishedAt, updatedAt: g.updatedAt, image: g.coverImagePath ? `/files/public/${g.coverImagePath}` : null })]} />

      <header className="rounded-[var(--r-xl)] bg-tint-sand p-6 md:p-10">
        <p className="eyebrow">{t("nav.guides")}</p>
        <h1 className="mt-2 max-w-3xl text-[30px] font-extrabold leading-[1.1] text-ink md:text-[44px]">{title}</h1>
        {excerpt && <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2 md:text-[18px]">{excerpt}</p>}
        <p className="mt-5 text-[13px] text-muted">
          {g.publishedAt && (
            <>
              {t("price.published")}: <span className="num">{formatDate(g.publishedAt, locale)}</span>
            </>
          )}
          {g.updatedAt && g.publishedAt && g.updatedAt > g.publishedAt ? ` · ${t("common.updated")}: ${formatDate(g.updatedAt, locale)}` : ""}
        </p>
        {g.coverImagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${g.coverImagePath}`} alt="" className="mt-6 w-full rounded-[var(--r-lg)] object-cover" />
        )}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
        <article className="min-w-0">
          <div id="guide-body" className="prose-simple text-[16px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          {related.length > 0 && (
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="text-[16px] font-bold text-ink">{t("category.related")}</h2>
              <ChipRow className="mt-3">
                {related.map((c) => (
                  <li key={c.id}>
                    <Chip href={`/commodities/${c.slug}`} size="sm">
                      {lname(locale, c)}
                    </Chip>
                  </li>
                ))}
              </ChipRow>
            </section>
          )}
        </article>
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <ArticleToc articleId="guide-body" label={t("browse.toc")} />
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="mb-5 text-[22px] font-bold text-ink">{t("guide.related")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {others.map((o, i) => (
              <GuideCard key={o.id} g={o} locale={locale} index={i + 1} moreLabel={t("browse.readMore")} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
