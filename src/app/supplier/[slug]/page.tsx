import type { Metadata } from "next";
import Link from "next/link";
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
import { Badge, verificationTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { ContactButtons } from "@/components/marketplace/contact-buttons";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportButton } from "@/components/marketplace/report-button";
import { ListingResults } from "@/components/marketplace/listing-results";
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

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("supplier.title"), href: "/suppliers" }, ...(sup.citySlug ? [{ label: sup.cityName ?? "", href: `/suppliers/${sup.citySlug}` }] : []), { label: sup.name }]} homeLabel={t("common.home")} />
      <JsonLd data={localBusiness ? [breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }, { name: sup.name, path }]), localBusiness] : breadcrumbJsonLd([{ name: t("common.home"), path: "/" }, { name: t("supplier.title"), path: "/suppliers" }, { name: sup.name, path }])} />
      {sup.status !== "active" && <Alert tone="warning" className="mb-4">{t("browse.guestNotice", { status: sup.status })}</Alert>}
      <header className="card flex flex-col gap-4 p-5 md:flex-row md:items-start">
        {sup.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${sup.logoPath}`} alt="" className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-3xl font-bold text-primary-strong" aria-hidden>
            {sup.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold md:text-3xl">{sup.name}</h1>
          <p className="mt-1 text-text-muted">
            {t(`browse.bizType.${sup.businessType}`)}
            {sup.cityName ? ` · ${[sup.marketName, sup.cityName, sup.provinceName].filter(Boolean).join(", ")}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={verificationTone(sup.verificationLevel)}>{t(`supplier.verification.${sup.verificationLevel}`)}</Badge>
            {sup.yearsInBusiness ? <Badge tone="neutral">{t("supplier.yearsInBusiness", { years: sup.yearsInBusiness })}</Badge> : null}
            <span className="text-sm text-text-muted">{t("browse.supplierSince", { brand, date: formatDate(sup.createdAt, locale) })}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ContactButtons businessId={sup.id} phoneAvailable={sup.phoneAvailable} whatsappAvailable={sup.whatsappAvailable} size="md" />
            <LinkButton href={`/rfq/new?supplier=${sup.slug}`} variant="outline">
              {t("action.enquire")}
            </LinkButton>
            <FavoriteButton kind="business" id={sup.id} initialSaved={saved} next={path} />
            {isOwner && (
              <LinkButton href="/dashboard/seller/business" variant="ghost">
                {t("action.edit")}
              </LinkButton>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {sup.description && (
            <Section title={t("supplier.about")}>
              <div className="card whitespace-pre-line p-5">{sup.description}</div>
            </Section>
          )}
          <Section title={t("supplier.listings")}>
            <ListingResults t={t} result={listings} hrefFor={(p) => pageHref(path, sp, p)} emptyTitle={t("supplier.noListings")} emptyBody="" emptyAction={<LinkButton href={`/rfq/new?supplier=${sup.slug}`} variant="primary">{t("action.enquire")}</LinkButton>} />
          </Section>
        </div>
        <aside>
          <div className="card p-5">
            <h2 className="font-bold">{t("supplier.commodities")}</h2>
            {sup.commodities.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {sup.commodities.map((c) => (
                  <li key={c.id}>
                    <Link href={`/commodities/${c.slug}`} className="inline-block min-h-[36px] rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-primary hover:text-primary">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-muted">{t("common.notAvailable")}</p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              {sup.addressLine && (
                <div>
                  <dt className="font-semibold">{t("browse.address")}</dt>
                  <dd className="text-text-muted">{sup.addressLine}</dd>
                </div>
              )}
              {sup.website && (
                <div>
                  <dt className="font-semibold">{t("browse.website")}</dt>
                  <dd>
                    <a href={sup.website.startsWith("http") ? sup.website : `https://${sup.website}`} rel="nofollow noopener" target="_blank" className="text-primary underline font-latin">
                      {sup.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
              {sup.languages.length > 0 && (
                <div>
                  <dt className="font-semibold">{t("browse.languages")}</dt>
                  <dd className="text-text-muted">{sup.languages.join(", ")}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">{t("common.listings")}</dt>
                <dd className="text-text-muted num">{sup.listingCount}</dd>
              </div>
            </dl>
            {!sup.phoneAvailable && !sup.whatsappAvailable && <p className="mt-3 text-sm text-text-muted">{t("supplier.contactHidden")}</p>}
            <p className="mt-4 text-xs text-text-muted">{t("browse.verificationExplain", { brand })}</p>
            <div className="mt-3">
              <ReportButton kind="business" id={sup.id} isGuest={!user} title={t("supplier.report")} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
