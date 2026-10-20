import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { commodities, listingImages, listingStatusHistory, listings, locations, units } from "@/db/schema";
import { getSellerContext } from "@/lib/business/context";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { ListingMedia } from "@/components/marketplace/cards";
import { Facts } from "@/components/flows/form-section";
import { formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/utils/format";

export default async function SellerListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { business, t, locale } = await getSellerContext(`/dashboard/seller/listings/${id}`);
  if (!business) redirect("/dashboard/seller");
  const [row] = await db
    .select({ l: listings, commodityName: commodities.nameEn, commodityNameUr: commodities.nameUr, commoditySlug: commodities.slug, unitSymbol: units.symbol, cityName: locations.nameEn, cityNameUr: locations.nameUr })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .innerJoin(units, eq(units.id, listings.unitId))
    .leftJoin(locations, eq(locations.id, listings.cityId))
    .where(and(eq(listings.id, id), eq(listings.businessId, business.id)))
    .limit(1);
  if (!row) notFound();
  const [images, history] = await Promise.all([
    db.select().from(listingImages).where(eq(listingImages.listingId, id)).orderBy(listingImages.sortOrder),
    db.select().from(listingStatusHistory).where(eq(listingStatusHistory.listingId, id)).orderBy(listingStatusHistory.createdAt),
  ]);
  const l = row.l;
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  const banner =
    l.status === "published" ? { tone: "success" as const, title: t("mylist.publishedTitle"), body: t("mylist.publishedBody") } : l.status === "pending_review" ? { tone: "info" as const, title: t("mylist.submittedTitle"), body: t("mylist.pendingBody") } : l.status === "draft" ? { tone: "warning" as const, title: t("mylist.draftTitle"), body: t("mylist.draftBody") } : l.status === "rejected" ? { tone: "danger" as const, title: t("listing.status.rejected"), body: t("mylist.rejectedBody") } : null;
  const priceText = l.priceAmount ? `${formatPKR(l.priceAmount)} · ${t(`price.${l.priceType === "on_contact" ? "onContact" : l.priceType}`)}` : t(`price.${l.priceType === "on_contact" ? "onContact" : l.priceType}`);
  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/seller/listings" className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("mylist.title")}
      </Link>
      {saved && banner && (
        <Alert tone={banner.tone} title={banner.title} className="mb-5">
          {banner.body}
        </Alert>
      )}
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start">
        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-[var(--r-md)] border border-line">
          <ListingMedia imagePath={images[0]?.storagePath} alt="" commoditySlug={row.commoditySlug} commodityName={row.commodityName} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={listingStatusTone(l.status)}>{t(`listing.status.${l.status}`)}</Badge>
            <span className="text-[13px] text-muted">
              {name({ nameEn: row.commodityName, nameUr: row.commodityNameUr })}
              {row.cityName ? ` · ${name({ nameEn: row.cityName, nameUr: row.cityNameUr })}` : ""}
            </span>
          </div>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight text-ink">{l.title}</h1>
          <div className="mt-3">
            <ListingRowActions listingId={l.id} slug={l.slug} status={l.status} />
          </div>
        </div>
      </header>
      {l.statusReason && (l.status === "rejected" || l.status === "removed") && (
        <Alert tone="danger" className="mt-5" title={t("mylist.reason")}>
          {l.statusReason}
        </Alert>
      )}
      <div className="mt-6">
        <Facts
          columns={2}
          items={[
            { label: t("common.quantity"), value: <span className="num">{formatNumber(l.quantity)} {row.unitSymbol}</span> },
            { label: t("common.price"), value: <span className="num">{priceText}</span> },
            { label: `${t("listing.views")} / ${t("listing.contacts")}`, value: <span className="num">{l.viewCount} / {l.contactClickCount}</span> },
            { label: t("listing.expires"), value: <span className="num">{l.expiresAt ? formatDate(l.expiresAt, locale) : "—"}</span> },
          ]}
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-6 flex gap-2 overflow-x-auto">
          {images.map((i) => (
            <li key={i.id} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/files/public/${i.storagePath}`} alt={i.altText ?? ""} className="h-24 w-32 rounded-[var(--r-sm)] border border-line object-cover" />
            </li>
          ))}
        </ul>
      )}
      {l.description && (
        <section className="mt-6 border-t border-line pt-5">
          <h2 className="text-[14px] font-bold uppercase tracking-wide text-muted">{t("common.description")}</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{l.description}</p>
        </section>
      )}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        {l.status === "published" && (
          <LinkButton href={`/listings/${l.slug}`} variant="secondary" size="sm">
            {t("mylist.preview")}
          </LinkButton>
        )}
        <LinkButton href="/dashboard/seller/listings/new" variant="outline" size="sm">
          {t("mylist.addAnother")}
        </LinkButton>
      </div>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-[17px] font-bold text-ink">{t("mylist.statusHistory")}</h2>
        <ol className="relative mt-3 border-s border-line ps-5">
          {history.map((h) => (
            <li key={h.id} className="relative pb-4 last:pb-0">
              <span className="absolute -start-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-800 ring-1 ring-line" aria-hidden />
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <Badge tone={listingStatusTone(h.newStatus)}>{t(`listing.status.${h.newStatus}`)}</Badge>
                <span className="text-muted num">{formatDateTime(h.createdAt, locale)}</span>
              </div>
              {h.reason && <p className="mt-1 text-[14px] text-ink-2">{h.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
