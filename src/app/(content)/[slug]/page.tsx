import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPageBySlug } from "@/lib/data/content";
import { markdownExcerpt, renderMarkdown } from "@/lib/content/markdown";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: title }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: p.titleEn, path: `/${p.slug}` }])} />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {t("common.updated")}: <span className="num">{formatDate(p.updatedAt, locale)}</span>
        </p>
        <div className="prose-simple mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      </article>
    </div>
  );
}
