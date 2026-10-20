import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Globe, Languages, MapPin, Package } from "lucide-react";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getT } from "@/lib/i18n/server";
import { redirectOr404 } from "@/lib/seo/redirects";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSupplierBySlug } from "@/lib/data/suppliers";
import { searchListings } from "@/lib/data/listings";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/authz/permissions";
import { isFavorited } from "@/lib/favorites/queries";
import { track } from "@/lib/analytics/track";
import { formatDate } from "@/lib/utils/format";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { pageHref, type SP } from "@/lib/data/browse-helpers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { VerificationLabel } from "@/components/marketplace/cards";
import { ContactButtons } from "@/components/marketplace/contact-buttons";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportButton } from "@/components/marketplace/report-button";
import { ListingResults } from "@/components/marketplace/listing-results";
import { Chip, ChipRow } from "@/components/public/chip";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sup = await getSupplierBySlug(slug, "en");
  if (!sup) return { title: "Not found" };
  const comms = sup.commodities.slice(0, 5).map((c) => c.name).join(", ");
  return buildMetadata({
    path: `/supplier/${sup.slug}`,
    entity: { type: "business", id: sup.id },
    title: `${sup.name}${sup.cityName ? ` — ${sup.cityName}` : ""} | Supplier`,
    description: `${sup.name}${sup.cityName ? ` in ${sup.cityName}` : ""}${comms ? ` supplies ${comms}` : ""}. ${sup.listingCount} published listings. Verification: ${sup.verificationLevel.replace(/_/g, " ")}.`,
    noindex: sup.status !== "active",
    image: sup.logoPath ? `/files/public/${sup.logoPath}` : null,
  });
}

export default async function SupplierProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const sup = await getSupplierBySlug(slug, locale);
  if (!sup) return redirectOr404();
  const user = await getCurrentUser();
  const isOwner = user?.id === sup.ownerId;
  const isMod = Boolean(user && hasPermission(user.roles, "listings.moderate"));
  if (sup.status !== "active" && !isOwner && !isMod) return redirectOr404();
  const page = Math.max(1, parseInt((sp.page as string) || "1", 10) || 1);
  const [listings, saved] = await Promise.all([searchListings({ businessId: sup.id, page, pageSize: 9, sort: "newest" }, locale), isFavorited(user?.id, "business", sup.id)]);
  if (!isOwner) await track("supplier_view", { entityType: "business", entityId: sup.id, path: `/supplier/${sup.slug}` });
  const path = `/supplier/${sup.slug}`;
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink";

  // LocalBusiness only when real, consented identifying info exists.
  let localBusiness: Record<string, unknown> | null = null;
  if (sup.cityName && (sup.phoneAvailable || sup.addressLine)) {
    const [b] = await db.select({ publicPhone: businesses.publicPhone, showPhone: businesses.showPhonePublicly }).from(businesses).where(eq(businesses.id, sup.id));
    localBusiness = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: sup.name,
      url: `${BRAND_DEFAULTS.siteUrl}${path}`,
      ...(sup.description ? { description: sup.description.slice(0, 500) } : {}),
      ...(sup.logoPath ? { image: `${BRAND_DEFAULTS.siteUrl}/files/public/${sup.logoPath}` } : {}),
      ...(b?.showPhone && b.publicPhone ? { telephone: b.publicPhone } : {}),
      address: { "@type": "PostalAddress", ...(sup.addressLine ? { streetAddress: sup.addressLine } : {}), addressLocality: sup.cityName, ...(sup.provinceName ? { addressRegion: sup.provinceName } : {}), addressCountry: "PK" },
    };
  }
  const location = [sup.marketName, sup.cityName, sup.provinceName].filter(Boolean).join(", ");
  const initial = sup.name.replace(/^\[sample\]\s*/i, "").slice(0, 1).toUpperCase();

  const contactPanel = (
    <div className="rounded-[var(--r-lg)] border border-line bg-surface p-5">
      <p className="eyebrow">{t("supplier.contact")}</p>
      <div className="mt-3">
        <ContactButtons businessId={sup.id} phoneAvailable={sup.phoneAvailable} whatsappAvailable={sup.whatsappAvailable} stacked />
      </div>
      <LinkButton href={`/rfq/new?supplier=${sup.slug}`} variant="outline" size="lg" className="mt-2 w-full">
        {t("action.enquire")}
      </LinkButton>
      <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[14px]">
        {location && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <dd className="text-ink-2">{sup.addressLine ? `${sup.addressLine}, ${location}` : location}</dd>
          </div>
        )}
        {sup.website && (
          <div className="flex items-start gap-2">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <dd>
              <a href={sup.website.startsWith("http") ? sup.website : `https://${sup.website}`} rel="nofollow noopener" target="_blank" className="font-latin text-brand-800 hover:underline">
                {sup.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        )}
        {sup.languages.length > 0 && (
          <div className="flex items-start gap-2">
            <Languages className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <dd className="text-ink-2">{sup.languages.join(", ")}</dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <dd className="text-ink-2 num">
            {sup.listingCount} {t("common.listings").toLowerCase()}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <dd className="text-ink-2">{t("browse.supplierSince", { brand, date: formatDate(sup.createdAt, locale) })}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <FavoriteButton kind="business" id={sup.id} initialSaved={saved} next={path} size="sm" />
        <ReportButton kind="business" id={sup.id} isGuest={!user} title={t("supplier.report")} />
      </div>
    </div>
  );

  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("supplier.title"), href: "/suppliers" }, ...(sup.citySlug ? [{ label: sup.cityName ?? "", href: `/suppliers/${sup.citySlug}` }] : []), { label: sup.name }]} homeLabel={t("common.home")} />
      <JsonLd data={localBusiness ? [breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }, { name: sup.name, path }]), localBusiness] : breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }, { name: sup.name, path }])} />
      {sup.status !== "active" && <Alert tone="warning" className="mb-4">{t("browse.guestNotice", { status: sup.status })}</Alert>}

      <header className="rounded-[var(--r-xl)] bg-tint-sky p-5 md:p-8">
        <div className="flex items-start gap-4 md:gap-6">
          {sup.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/files/public/${sup.logoPath}`} alt="" className="h-16 w-16 shrink-0 rounded-[var(--r-md)] object-cover md:h-24 md:w-24" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-brand-900 text-[28px] font-extrabold text-lime-400 md:h-24 md:w-24 md:text-[40px]" aria-hidden>
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t(`browse.bizType.${sup.businessType}`)}</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight text-ink md:text-[36px]">{sup.name}</h1>
            {location && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[15px] text-ink-2">
                <MapPin className="h-4 w-4 text-muted" aria-hidden /> {location}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerificationLabel level={sup.verificationLevel} t={t} />
              {sup.yearsInBusiness ? <span className="text-[13px] text-muted">{t("supplier.yearsInBusiness", { years: sup.yearsInBusiness })}</span> : null}
              {isOwner && (
                <Link href="/dashboard/seller/business" className="text-[13px] font-semibold text-brand-800 underline underline-offset-4">
                  {t("action.edit")}
                </Link>
              )}
            </div>
          </div>
        </div>
        {sup.commodities.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">{t("supplier.commodities")}</p>
            <ChipRow scroll>
              {sup.commodities.map((c) => (
                <li key={c.id}>
                  <Chip href={`/commodities/${c.slug}`} size="sm" className="bg-white/80">
                    {c.name}
                  </Chip>
                </li>
              ))}
            </ChipRow>
          </div>
        )}
        <div className="mt-5 lg:hidden">{contactPanel}</div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0">
          {sup.description && (
            <section className="mb-8">
              <h2 className="mb-2 text-[18px] font-bold text-ink">{t("supplier.about")}</h2>
              <p className="max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{sup.description}</p>
            </section>
          )}
          <Section title={t("supplier.listings")} className="!pt-0" subtitle={listings.total > 0 ? t("browse.resultsCount", { count: listings.total }) : undefined}>
            <ListingResults t={t} result={listings} hrefFor={(p) => pageHref(path, sp, p)} emptyTitle={t("supplier.noListings")} emptyBody="" emptyAction={<LinkButton href={`/rfq/new?supplier=${sup.slug}`} variant="primary">{t("action.enquire")}</LinkButton>} />
          </Section>
        </div>
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          {contactPanel}
          <p className="mt-3 text-[12px] leading-relaxed text-muted">{t("browse.verificationExplain", { brand })}</p>
        </aside>
      </div>
    </div>
  );
}
