import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPageBySlug } from "@/lib/data/content";
import { markdownExcerpt, renderMarkdown } from "@/lib/content/markdown";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArticleToc } from "@/components/public/toc";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

/** Reserved top-level routes that must never be served as content pages. */
const RESERVED = new Set(["admin", "api", "login", "onboarding", "dashboard", "account", "favorites", "notifications", "rfq", "sell", "buy", "search", "prices", "suppliers", "supplier", "listings", "commodities", "categories", "markets", "guides", "contact", "files", "forbidden"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED.has(slug)) return { title: "Not found" };
  const p = await getPageBySlug(slug);
  if (!p) return { title: "Not found" };
  return buildMetadata({ path: `/${p.slug}`, entity: { type: "content", id: p.id }, title: p.titleEn, description: p.excerptEn || markdownExcerpt(p.bodyEn) });
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED.has(slug)) return redirectOr404();
  const { t, locale } = await getT();
  const p = await getPageBySlug(slug);
  if (!p) return redirectOr404();
  const title = locale === "ur" && p.titleUr ? p.titleUr : p.titleEn;
  const body = locale === "ur" && p.bodyUr ? p.bodyUr : p.bodyEn;
  const excerpt = locale === "ur" && p.excerptUr ? p.excerptUr : p.excerptEn;
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: title }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: p.titleEn, path: `/${p.slug}` }])} />
      <header className="border-b border-line pb-6 md:pb-8">
        <h1 className="max-w-3xl text-[30px] font-extrabold leading-[1.1] text-ink md:text-[40px]">{title}</h1>
        {excerpt && <p className="mt-3 max-w-2xl text-[16px] text-ink-2">{excerpt}</p>}
        <p className="mt-3 text-[13px] text-muted">
          {t("common.updated")}: <span className="num">{formatDate(p.updatedAt, locale)}</span>
        </p>
      </header>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
        <article id="page-body" className="prose-simple min-w-0 text-[16px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <ArticleToc articleId="page-body" label={t("browse.toc")} />
        </aside>
      </div>
    </div>
  );
}
