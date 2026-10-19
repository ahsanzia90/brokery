import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { bumpListingViews, getListingBySlug, getSimilarListings } from "@/lib/data/listings";
import { getCategoryAncestors } from "@/lib/data/taxonomy";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/authz/permissions";
import { isFavorited } from "@/lib/favorites/queries";
import { track } from "@/lib/analytics/track";
import { lname } from "@/lib/data/browse-helpers";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { Badge, listingStatusTone, verificationTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { ListingCard, priceLabel } from "@/components/marketplace/cards";
import { ContactButtons } from "@/components/marketplace/contact-buttons";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportButton } from "@/components/marketplace/report-button";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getListingBySlug(slug, "en");
  if (!d) return { title: "Not found" };
  const price = d.listing.priceAmount && (d.listing.priceType === "fixed" || d.listing.priceType === "negotiable") ? ` – ${formatPKR(d.listing.priceAmount)}${d.priceUnit ? `/${d.priceUnit.symbol}` : ""}` : "";
  return buildMetadata({
    path: `/listings/${d.listing.slug}`,
    title: `${d.listing.title}${d.location.city ? ` in ${d.location.city}` : ""}`,
    description: `${d.commodity.nameEn}${d.variety ? ` ${d.variety.nameEn}` : ""}: ${formatNumber(d.listing.quantity)} ${d.unit.symbol} available from ${d.business.name}${d.location.city ? `, ${d.location.city}` : ""}${price}. Contact the supplier or request a quote.`,
    noindex: d.listing.status !== "published",
    image: d.images[0] ? `/files/public/${d.images[0].storagePath}` : null,
  });
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  const { t, locale } = await getT();
  const d = await getListingBySlug(slug, locale);
  if (!d) return redirectOr404();
  const user = await getCurrentUser();
  const isOwner = Boolean(user && user.id === d.business.ownerId);
  const isMod = Boolean(user && hasPermission(user.roles, "listings.moderate"));
  const isPublic = d.listing.status === "published";
  if (!isPublic && !isOwner && !isMod) return redirectOr404();

  const [ancestors, similar, saved] = await Promise.all([getCategoryAncestors(d.commodity.categoryId), isPublic ? getSimilarListings(d, locale, 6) : Promise.resolve([]), isFavorited(user?.id, "listing", d.listing.id)]);
  if (isPublic && !isOwner) {
    void bumpListingViews(d.listing.id).catch(() => {});
    await track("listing_view", { entityType: "listing", entityId: d.listing.id, path: `/listings/${d.listing.slug}` });
  }
  const cname = lname(locale, d.commodity);
  const path = `/listings/${d.listing.slug}`;
  const crumbPaths = [{ name: t("common.home"), path: "/" }, ...ancestors.map((a) => ({ name: lname(locale, a), path: `/categories/${a.slug}` })), { name: cname, path: `/commodities/${d.commodity.slug}` }, { name: d.listing.title, path }];
  const locationText = [d.location.market, d.location.city, d.location.province].filter(Boolean).join(", ");
  const productJsonLd =
    isPublic && d.listing.priceType === "fixed" && d.listing.priceAmount
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: d.listing.title,
          ...(d.listing.description ? { description: d.listing.description.slice(0, 500) } : {}),
          ...(d.images[0] ? { image: [`${BRAND_DEFAULTS.siteUrl}/files/public/${d.images[0].storagePath}`] } : {}),
          category: d.commodity.nameEn,
          offers: {
            "@type": "Offer",
            url: `${BRAND_DEFAULTS.siteUrl}${path}`,
            priceCurrency: d.listing.currency,
            price: Number(d.listing.priceAmount),
            ...(d.priceUnit ? { priceSpecification: { "@type": "UnitPriceSpecification", price: Number(d.listing.priceAmount), priceCurrency: d.listing.currency, unitText: d.priceUnit.symbol } } : {}),
            availability: d.listing.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: d.business.name, url: `${BRAND_DEFAULTS.siteUrl}/supplier/${d.business.slug}` },
          },
        }
      : null;

  const spec: Array<[string, string]> = [
    [t("common.commodity"), cname],
    ...(d.variety || d.listing.customVariety ? [[t("common.variety"), d.variety ? lname(locale, d.variety) : `${d.listing.customVariety} (${t("browse.customSpec")})`] as [string, string]] : []),
    ...(d.grade || d.listing.customGrade ? [[t("common.grade"), d.grade ? lname(locale, d.grade) : `${d.listing.customGrade} (${t("browse.customSpec")})`] as [string, string]] : []),
    [t("common.quantity"), `${formatNumber(d.listing.quantity)} ${d.unit.symbol}${d.listing.quantityKg ? ` (≈ ${formatNumber(d.listing.quantityKg)} kg)` : ""}`],
    ...(d.listing.minOrderQuantity ? [[t("common.minOrder"), `${formatNumber(d.listing.minOrderQuantity)} ${d.minOrderUnit?.symbol ?? d.unit.symbol}`] as [string, string]] : []),
    ...(d.listing.packaging ? [[t("common.packaging"), d.listing.packaging] as [string, string]] : []),
    ...(d.listing.condition !== "not_applicable" ? [[t("common.condition"), d.listing.condition] as [string, string]] : []),
    ...(d.listing.availableFrom ? [[t("common.availableFrom"), formatDate(d.listing.availableFrom, locale)] as [string, string]] : []),
    [t("common.delivery"), t(`listing.delivery.${d.listing.deliveryAvailable}`)],
    ...(d.listing.pickupLocation ? [[t("common.pickup"), d.listing.pickupLocation] as [string, string]] : []),
    ...d.attributes.map((a) => [a.label, `${a.value}${a.unitLabel ? ` ${a.unitLabel}` : ""}`] as [string, string]),
  ];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbPaths.slice(1).map((c, i, arr) => (i === arr.length - 1 ? { label: c.name } : { label: c.name, href: c.path }))} homeLabel={t("common.home")} />
      <JsonLd data={productJsonLd ? [breadcrumbJsonLd(crumbPaths), productJsonLd] : breadcrumbJsonLd(crumbPaths)} />
      {!isPublic && (
        <Alert tone="warning" className="mb-4">
          {t("browse.guestNotice", { status: t(`listing.status.${d.listing.status}`) })}
          {isOwner && (
            <>
              {" "}
              <Link href={`/dashboard/seller/listings/${d.listing.id}`} className="font-semibold underline">
                {t("action.edit")}
              </Link>
            </>
          )}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <ImageGallery images={d.images.map((i) => ({ src: `/files/public/${i.storagePath}`, alt: i.altText || d.listing.title }))} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={listingStatusTone(d.listing.availability === "available" ? "published" : "paused")}>{t(`listing.availability.${d.listing.availability}`)}</Badge>
            {d.listing.publishedAt && (
              <span className="text-sm text-text-muted">
                {t("browse.listedOn")} <span className="num">{formatDate(d.listing.publishedAt, locale)}</span>
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{d.listing.title}</h1>
          <p className="mt-2 text-2xl font-extrabold text-primary-strong num">{priceLabel(t, { priceType: d.listing.priceType, priceAmount: d.listing.priceAmount, priceUnitSymbol: d.priceUnit?.symbol ?? null })}</p>
          {locationText && <p className="mt-1 text-text-muted">📍 {locationText}</p>}

          <div className="mt-4 flex flex-wrap gap-3 lg:hidden">
            <ContactButtons businessId={d.business.id} listingId={d.listing.id} phoneAvailable={d.business.phoneAvailable} whatsappAvailable={d.business.whatsappAvailable} />
          </div>

          <Section title={t("listing.specifications")}>
            <div className="card overflow-hidden">
              <table className="w-full text-[0.95rem]">
                <tbody>
                  {spec.map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-0">
                      <th scope="row" className="w-2/5 bg-surface-muted px-4 py-2.5 text-start font-semibold">
                        {k}
                      </th>
                      <td className="px-4 py-2.5 num">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {d.listing.description && (
            <Section title={t("common.description")}>
              <div className="card whitespace-pre-line p-5">{d.listing.description}</div>
            </Section>
          )}

          {d.documents.length > 0 && (
            <Section title={t("browse.documents")}>
              <ul className="card divide-y divide-border">
                {d.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span>{doc.label}</span>
                    <a href={`/files/private/${doc.storagePath}`} className="font-semibold text-primary underline" target="_blank" rel="noopener">
                      {t("action.view")}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <FavoriteButton kind="listing" id={d.listing.id} initialSaved={saved} next={path} />
            <ReportButton kind="listing" id={d.listing.id} isGuest={!user} title={t("listing.reportTitle")} />
            <span className="ms-auto text-xs text-text-muted font-latin">
              {t("browse.listingRef")}: {d.listing.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="text-sm text-text-muted">{t("listing.postedBy")}</p>
            <h2 className="text-xl font-bold">
              <Link href={`/supplier/${d.business.slug}`} className="hover:text-primary">
                {d.business.name}
              </Link>
            </h2>
            <p className="text-sm text-text-muted">
              {t(`browse.bizType.${d.business.businessType}`)}
              {d.business.cityName ? ` · ${d.business.cityName}` : ""}
            </p>
            <Badge tone={verificationTone(d.business.verificationLevel)} className="mt-2">
              {t(`supplier.verification.${d.business.verificationLevel}`)}
            </Badge>
            <div className="mt-4 hidden lg:block">
              <ContactButtons businessId={d.business.id} listingId={d.listing.id} phoneAvailable={d.business.phoneAvailable} whatsappAvailable={d.business.whatsappAvailable} />
            </div>
            <LinkButton href={`/rfq/new?listing=${d.listing.slug}`} variant="outline" size="lg" className="mt-3 w-full">
              {t("action.requestQuote")}
            </LinkButton>
            <p className="mt-3 text-xs text-text-muted">{t("browse.whatsappVia")}</p>
            <p className="mt-2 text-xs text-text-muted">{t("common.disclaimer", { brand: process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink" })}</p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <Section title={t("listing.similar")} action={{ href: `/commodities/${d.commodity.slug}#listings`, label: t("action.viewAll") }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
