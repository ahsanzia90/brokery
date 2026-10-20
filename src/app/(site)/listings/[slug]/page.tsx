import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, MapPin, ShieldCheck, Truck } from "lucide-react";
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
import { formatQuantity } from "@/lib/utils/format";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { ListingCard, VerificationLabel, priceLabel } from "@/components/marketplace/cards";
import { ContactButtons } from "@/components/marketplace/contact-buttons";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportButton } from "@/components/marketplace/report-button";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { FactGrid, SpecTable } from "@/components/public/facts";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[18px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getListingBySlug(slug, "en");
  if (!d) return { title: "Not found" };
  const price = d.listing.priceAmount && (d.listing.priceType === "fixed" || d.listing.priceType === "negotiable") ? ` – ${formatPKR(d.listing.priceAmount)}${d.priceUnit ? `/${d.priceUnit.symbol}` : ""}` : "";
  return buildMetadata({
    path: `/listings/${d.listing.slug}`,
    title: `${d.listing.title}${d.location.city ? ` in ${d.location.city}` : ""}`,
    description: `${d.commodity.nameEn}${d.variety ? ` ${d.variety.nameEn}` : ""}: ${formatQuantity(d.listing.quantity, d.unit.symbol)} available from ${d.business.name}${d.location.city ? `, ${d.location.city}` : ""}${price}. Contact the supplier or request a quote.`,
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

  const varietyText = d.variety ? lname(locale, d.variety) : d.listing.customVariety ? `${d.listing.customVariety} (${t("browse.customSpec")})` : null;
  const gradeText = d.grade ? lname(locale, d.grade) : d.listing.customGrade ? `${d.listing.customGrade} (${t("browse.customSpec")})` : null;

  const facts = [
    { label: t("common.quantity"), value: `${formatQuantity(d.listing.quantity, d.unit.symbol)}${d.listing.quantityKg ? ` (≈ ${formatNumber(d.listing.quantityKg)} kg)` : ""}` },
    ...(d.listing.minOrderQuantity ? [{ label: t("common.minOrder"), value: `${formatNumber(d.listing.minOrderQuantity)} ${d.minOrderUnit?.symbol ?? d.unit.symbol}` }] : []),
    { label: t("common.location"), value: locationText || t("common.notAvailable") },
    { label: t("common.delivery"), value: t(`listing.delivery.${d.listing.deliveryAvailable}`) },
    ...(d.listing.packaging ? [{ label: t("common.packaging"), value: d.listing.packaging }] : []),
    ...(d.listing.condition !== "not_applicable" ? [{ label: t("common.condition"), value: d.listing.condition }] : []),
    ...(d.listing.availableFrom ? [{ label: t("common.availableFrom"), value: formatDate(d.listing.availableFrom, locale) }] : []),
    ...(d.listing.pickupLocation ? [{ label: t("common.pickup"), value: d.listing.pickupLocation }] : []),
  ];
  const spec: Array<[string, string]> = [
    [t("common.commodity"), cname],
    ...(varietyText ? [[t("common.variety"), varietyText] as [string, string]] : []),
    ...(gradeText ? [[t("common.grade"), gradeText] as [string, string]] : []),
    ...d.attributes.map((a) => [a.label, `${a.value}${a.unitLabel ? ` ${a.unitLabel}` : ""}`] as [string, string]),
  ];
  const hasAmount = Boolean(d.listing.priceAmount && (d.listing.priceType === "fixed" || d.listing.priceType === "negotiable"));
  const price = hasAmount ? `${formatPKR(d.listing.priceAmount)}${d.priceUnit ? ` / ${d.priceUnit.symbol}` : ""}` : priceLabel(t, { priceType: d.listing.priceType, priceAmount: d.listing.priceAmount, priceUnitSymbol: d.priceUnit?.symbol ?? null });
  const priceTypeLabel = d.listing.priceType === "negotiable" ? t("price.negotiable") : d.listing.priceType === "fixed" ? t("price.fixed") : null;

  const supplierPanel = (
    <div className="rounded-[var(--r-lg)] border border-line bg-surface p-5">
      <p className="eyebrow">{t("browse.supplierPanel")}</p>
      <div className="mt-3 flex items-center gap-3">
        {d.business.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${d.business.logoPath}`} alt="" className="h-12 w-12 rounded-[var(--r-sm)] object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-brand-900 text-[18px] font-extrabold text-lime-400" aria-hidden>
            {d.business.name.replace(/^\[sample\]\s*/i, "").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold text-ink">
            <Link href={`/supplier/${d.business.slug}`} className="hover:text-brand-800">
              {d.business.name}
            </Link>
          </h2>
          <p className="text-[13px] text-muted">
            {t(`browse.bizType.${d.business.businessType}`)}
            {d.business.cityName ? ` · ${d.business.cityName}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <VerificationLabel level={d.business.verificationLevel} t={t} />
      </div>
      <div className="mt-4">
        <ContactButtons businessId={d.business.id} listingId={d.listing.id} phoneAvailable={d.business.phoneAvailable} whatsappAvailable={d.business.whatsappAvailable} stacked />
      </div>
      <LinkButton href={`/rfq/new?listing=${d.listing.slug}`} variant="outline" size="lg" className="mt-2 w-full">
        {t("action.requestQuote")}
      </LinkButton>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">{t("browse.whatsappVia")}</p>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <FavoriteButton kind="listing" id={d.listing.id} initialSaved={saved} next={path} size="sm" />
        <ReportButton kind="listing" id={d.listing.id} isGuest={!user} title={t("listing.reportTitle")} />
      </div>
    </div>
  );

  return (
    <div className="container-page py-5 md:py-6">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0">
          <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start">
            <ImageGallery images={d.images.map((i) => ({ src: `/files/public/${i.storagePath}`, alt: i.altText || d.listing.title }))} commoditySlug={d.commodity.slug} commodityName={d.commodity.nameEn} />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
                <Link href={`/commodities/${d.commodity.slug}`} className="hover:underline">{cname}</Link>
                {varietyText ? <span className="text-muted"> · {varietyText}</span> : null}
              </p>
              <h1 className="mt-1.5 text-[24px] font-extrabold leading-tight text-ink md:text-[30px]">{d.listing.title}</h1>
              <div className="mt-4 rounded-[var(--r-md)] bg-surface-2 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("browse.priceFrom")}</p>
                <p className={`mt-0.5 font-extrabold text-ink num ${hasAmount ? "text-[28px]" : "text-[20px]"}`}>{price}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {hasAmount && priceTypeLabel && <Badge tone="lavender">{priceTypeLabel}</Badge>}
                  <Badge tone={listingStatusTone(d.listing.availability === "available" ? "published" : "paused")} dot>
                    {t(`listing.availability.${d.listing.availability}`)}
                  </Badge>
                  {d.listing.publishedAt && (
                    <span className="inline-flex items-center gap-1 text-[13px] text-muted">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {t("browse.listedOn")} <span className="num">{formatDate(d.listing.publishedAt, locale)}</span>
                    </span>
                  )}
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-[14px] text-ink-2">
                {locationText && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted" aria-hidden /> {locationText}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted" aria-hidden /> {t(`listing.delivery.${d.listing.deliveryAvailable}`)}
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted" aria-hidden /> {t(`supplier.verification.${d.business.verificationLevel}`)}
                </li>
              </ul>
              <div className="mt-5 lg:hidden">
                <ContactButtons businessId={d.business.id} listingId={d.listing.id} phoneAvailable={d.business.phoneAvailable} whatsappAvailable={d.business.whatsappAvailable} />
                <LinkButton href={`/rfq/new?listing=${d.listing.slug}`} variant="outline" size="lg" className="mt-2 w-full">
                  {t("action.requestQuote")}
                </LinkButton>
              </div>
            </div>
          </div>

          <Sub title={t("browse.keyFacts")}>
            <FactGrid facts={facts} columns={3} />
          </Sub>

          {d.listing.description && (
            <Sub title={t("common.description")}>
              <div className="max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{d.listing.description}</div>
            </Sub>
          )}

          <Sub title={t("listing.specifications")}>
            <SpecTable rows={spec} />
          </Sub>

          {d.documents.length > 0 && (
            <Sub title={t("browse.documents")}>
              <ul className="divide-y divide-line rounded-[var(--r-md)] border border-line">
                {d.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted" aria-hidden /> {doc.label}</span>
                    <a href={`/files/private/${doc.storagePath}`} className="font-semibold text-brand-800 hover:underline" target="_blank" rel="noopener">
                      {t("action.view")}
                    </a>
                  </li>
                ))}
              </ul>
            </Sub>
          )}

          <p className="mt-6 text-[12px] text-muted font-latin">
            {t("browse.listingRef")}: {d.listing.id.slice(0, 8)}
          </p>
          <div className="mt-4 lg:hidden">
            <div className="flex items-center gap-3">
              <FavoriteButton kind="listing" id={d.listing.id} initialSaved={saved} next={path} size="sm" />
              <ReportButton kind="listing" id={d.listing.id} isGuest={!user} title={t("listing.reportTitle")} />
            </div>
          </div>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          {supplierPanel}
          <p className="mt-3 text-[12px] leading-relaxed text-muted">{t("common.disclaimer", { brand: process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink" })}</p>
        </aside>
      </div>

      {similar.length > 0 && (
        <Section title={t("listing.similar")} action={{ href: `/commodities/${d.commodity.slug}#listings`, label: t("action.viewAll") }}>
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:grid-cols-2 lg:grid-cols-3 [&>*]:w-[78vw] sm:[&>*]:w-auto">
            {similar.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
