import { CommodityVisual } from "@/components/marketplace/commodity-visual";
import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ChevronRight, PackageSearch } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllCategories, getCategoryAncestors, getCategoryBySlug, getCommoditiesInCategory } from "@/lib/data/taxonomy";
import { getListingCountsByCommodity, searchListings } from "@/lib/data/listings";
import { getGuides } from "@/lib/data/content";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingCard } from "@/components/marketplace/cards";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { lname } from "@/lib/data/browse-helpers";
import { createTranslator } from "@/lib/i18n/translate";
import { track } from "@/lib/analytics/track";
import { LinkButton } from "@/components/ui/button";
import { PageHero } from "@/components/public/page-hero";
import { Chip, ChipRow } from "@/components/public/chip";
import { GuideCard } from "@/components/public/guide-card";
import { artKeyFor, artTint } from "@/components/illustrations/commodity-art";

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
  if (!cat) return redirectOr404();
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
  const guides = (await getGuides(1, 50)).items.filter((g) => g.relatedCommodityIds.some((id) => commodities.some((c) => c.id === id))).slice(0, 3);
  await track("category_view", { entityType: "category", entityId: cat.id, path: `/categories/${cat.slug}` });
  const name = lname(locale, cat);
  const parents = ancestors.filter((a) => a.id !== cat.id);
  const crumbs = parents.map((a) => ({ label: lname(locale, a), href: `/categories/${a.slug}` }));
  const siblings = cat.parentId ? all.filter((c) => c.parentId === cat.parentId && c.id !== cat.id && c.status === "active") : [];
  const parent = parents[parents.length - 1];
  const list = children.length ? commodities : directCommodities;

  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("category.title"), href: "/categories" }, ...crumbs, { label: name }]} homeLabel={t("common.home")} />
      <JsonLd data={breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("category.title"), path: "/categories" }, ...ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` }))])} />
      <PageHero
        eyebrow={parent ? lname(locale, parent) : t("browse.heroEyebrow.category")}
        title={name}
        altName={locale === "ur" ? cat.nameEn : cat.nameUr}
        intro={(locale === "ur" ? cat.descriptionUr || cat.description : cat.description) || t("browse.intro.category", { name })}
        slug={cat.slug}
        name={cat.nameEn}
        imagePath={cat.imagePath}
        actions={
          <>
            <LinkButton href={`/rfq/new?category=${cat.slug}`} variant="primary" size="lg">
              {t("action.createRfq")}
            </LinkButton>
            <LinkButton href={`/dashboard/seller/listings/new?category=${cat.slug}`} variant="outline" size="lg" className="bg-white/70">
              {t("category.sellThis", { name })}
            </LinkButton>
          </>
        }
      />

      {children.length > 0 && (
        <Section eyebrow={t("browse.inThisCategory")} title={t("category.subcategories")}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((s) => {
              const n = commodities.filter((c) => c.categoryId === s.id).length;
              const key = artKeyFor(s.slug, s.nameEn);
              return (
                <li key={s.id}>
                  <Link href={`/categories/${s.slug}`} className="group flex items-center gap-3 rounded-[var(--r-md)] border border-line bg-surface p-3 transition-colors hover:border-brand-700">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${artTint[key]}`}>
                      <CommodityVisual artKey={key} className="h-9 w-9" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-brand-900">{lname(locale, s)}</span>
                      <span className="block text-[12px] text-muted num">{t("browse.commoditiesCount", { count: n })}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-2 rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={t("category.commodities")} subtitle={list.length ? t("browse.categoryCommodities", { count: list.length }) : undefined}>
        {list.length ? (
          <ChipRow>
            {list.map((c) => (
              <li key={c.id}>
                <Chip href={`/commodities/${c.slug}`} count={counts.get(c.id) ?? 0}>
                  {lname(locale, c)}
                </Chip>
              </li>
            ))}
          </ChipRow>
        ) : (
          <EmptyState compact title={t("empty.generic")} body={t("empty.hint")} />
        )}
      </Section>

      <Section eyebrow={t("home.listings.eyebrow")} title={t("home.listings.title")} action={recent.total > 6 ? { href: `/listings?category=${cat.slug}`, label: t("action.viewAll") } : undefined}>
        {recent.items.length ? (
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-[78vw] sm:[&>*]:w-auto">
            {recent.items.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={t("listing.empty")} body={t("listing.emptyHint")} action={<LinkButton href={`/rfq/new?category=${cat.slug}`} variant="primary">{t("action.createRfq")}</LinkButton>} />
        )}
      </Section>

      {(siblings.length > 0 || guides.length > 0) && (
        <div className="border-t border-line">
          {siblings.length > 0 && (
            <section className="py-10">
              <h2 className="text-[18px] font-bold text-ink">{t("category.related")}</h2>
              <ChipRow className="mt-3">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <Chip href={`/categories/${s.slug}`} size="sm">
                      {lname(locale, s)}
                    </Chip>
                  </li>
                ))}
              </ChipRow>
            </section>
          )}
          {guides.length > 0 && (
            <Section eyebrow={t("nav.guides")} title={t("category.guides")} action={{ href: "/guides", label: t("browse.allGuides") }}>
              <div className="grid gap-4 md:grid-cols-3">
                {guides.map((g, i) => (
                  <GuideCard key={g.id} g={g} locale={locale} index={i} moreLabel={t("browse.readMore")} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
