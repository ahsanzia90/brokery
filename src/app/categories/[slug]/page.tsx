import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllCategories, getCategoryAncestors, getCategoryBySlug, getCommoditiesInCategory } from "@/lib/data/taxonomy";
import { getListingCountsByCommodity, searchListings } from "@/lib/data/listings";
import { getGuides } from "@/lib/data/content";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingCard } from "@/components/marketplace/cards";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { lname } from "@/lib/data/browse-helpers";
import { createTranslator } from "@/lib/i18n/translate";
import { track } from "@/lib/analytics/track";
import { LinkButton } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Not found" };
  const t = createTranslator("en");
  return buildMetadata({
    path: `/categories/${cat.slug}`,
    entity: { type: "category", id: cat.id },
    title: cat.seoTitle || t("browse.seo.categoryTitle", { name: cat.nameEn }),
    description: cat.seoDescription || cat.description || t("browse.intro.category", { name: cat.nameEn }),
    noindex: cat.status !== "active",
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  if (cat.status === "merged" && cat.mergedIntoId) {
    const all = await getAllCategories();
    const target = all.find((c) => c.id === cat.mergedIntoId);
    if (target) permanentRedirect(`/categories/${target.slug}`);
  }
  const { t, locale } = await getT();
  const [ancestors, all, commodities] = await Promise.all([getCategoryAncestors(cat.id), getAllCategories(), getCommoditiesInCategory(cat.id)]);
  const children = all.filter((c) => c.parentId === cat.id && c.status === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const directCommodities = commodities.filter((c) => c.categoryId === cat.id);
  const counts = await getListingCountsByCommodity(commodities.map((c) => c.id));
  const recent = await searchListings({ categoryId: cat.id, pageSize: 6, sort: "newest" }, locale);
  const guides = (await getGuides(1, 50)).items.filter((g) => g.relatedCommodityIds.some((id) => commodities.some((c) => c.id === id))).slice(0, 4);
  await track("category_view", { entityType: "category", entityId: cat.id, path: `/categories/${cat.slug}` });
  const name = lname(locale, cat);
  const crumbs = ancestors.map((a) => ({ label: lname(locale, a), href: `/categories/${a.slug}` }));
  const siblings = cat.parentId ? all.filter((c) => c.parentId === cat.parentId && c.id !== cat.id && c.status === "active") : [];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("category.title"), href: "/categories" }, ...crumbs]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` }))])} />
      <PageHeader title={`${cat.icon ? cat.icon + " " : ""}${name}`} subtitle={(locale === "ur" ? cat.descriptionUr || cat.description : cat.description) || t("browse.intro.category", { name })}>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={`/rfq/new?category=${cat.slug}`} variant="primary">
            {t("category.buyThis", { name })}
          </LinkButton>
          <LinkButton href={`/dashboard/seller/listings/new?category=${cat.slug}`} variant="accent">
            {t("category.sellThis", { name })}
          </LinkButton>
        </div>
      </PageHeader>

      {children.length > 0 && (
        <Section title={t("category.subcategories")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((s) => {
              const n = commodities.filter((c) => c.categoryId === s.id).length;
              return (
                <Link key={s.id} href={`/categories/${s.slug}`} className="card flex min-h-[72px] items-center justify-between gap-3 p-4 hover:border-primary">
                  <span className="font-semibold">{lname(locale, s)}</span>
                  <span className="text-sm text-text-muted num">{t("browse.commoditiesCount", { count: n })}</span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t("category.commodities")}>
        {(children.length ? commodities : directCommodities).length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(children.length ? commodities : directCommodities).map((c) => (
              <li key={c.id}>
                <Link href={`/commodities/${c.slug}`} className="card flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 hover:border-primary">
                  <span className="font-semibold">{lname(locale, c)}</span>
                  {(counts.get(c.id) ?? 0) > 0 && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-sm font-semibold text-primary-strong num">{counts.get(c.id)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("empty.generic")} body={t("empty.hint")} />
        )}
      </Section>

      <Section title={t("home.listings.title")} action={recent.total > 6 ? { href: `/listings?category=${cat.slug}`, label: t("action.viewAll") } : undefined}>
        {recent.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.items.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState icon="📦" title={t("listing.empty")} body={t("listing.emptyHint")} action={<Link href={`/rfq/new?category=${cat.slug}`} className="font-semibold text-primary underline">{t("action.createRfq")}</Link>} />
        )}
      </Section>

      {siblings.length > 0 && (
        <Section title={t("category.related")}>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link href={`/categories/${s.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary hover:text-primary">
                  {lname(locale, s)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {guides.length > 0 && (
        <Section title={t("category.guides")}>
          <ul className="grid gap-3 md:grid-cols-2">
            {guides.map((g) => (
              <li key={g.id} className="card p-4">
                <Link href={`/guides/${g.slug}`} className="font-bold hover:text-primary">
                  {locale === "ur" && g.titleUr ? g.titleUr : g.titleEn}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-text-muted">{locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
