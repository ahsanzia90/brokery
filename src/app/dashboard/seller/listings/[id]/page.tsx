import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commodities, listingImages, listingStatusHistory, listings, locations, units } from "@/db/schema";
import { getSellerContext } from "@/lib/business/context";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/utils/format";

export default async function SellerListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { business, t, locale } = await getSellerContext(`/dashboard/seller/listings/${id}`);
  if (!business) redirect("/dashboard/seller");
  const [row] = await db
    .select({ l: listings, commodityName: commodities.nameEn, commodityNameUr: commodities.nameUr, unitSymbol: units.symbol, cityName: locations.nameEn, cityNameUr: locations.nameUr })
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
  return (
    <div className="max-w-3xl">
      {saved && banner && (
        <Alert tone={banner.tone} title={banner.title} className="mb-4">
          {banner.body}
        </Alert>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{l.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-text-muted">
            <Badge tone={listingStatusTone(l.status)}>{t(`listing.status.${l.status}`)}</Badge>
            <span>{name({ nameEn: row.commodityName, nameUr: row.commodityNameUr })}</span>
            {row.cityName && <span>· {name({ nameEn: row.cityName, nameUr: row.cityNameUr })}</span>}
          </p>
        </div>
        <ListingRowActions listingId={l.id} slug={l.slug} status={l.status} />
      </div>
      {l.statusReason && (l.status === "rejected" || l.status === "removed") && (
        <Alert tone="danger" className="mt-4" title={t("mylist.reason")}>
          {l.statusReason}
        </Alert>
      )}
      <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-text-muted">{t("common.quantity")}</p>
          <p className="text-lg font-bold num">
            {formatNumber(l.quantity)} {row.unitSymbol}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-muted">{t("common.price")}</p>
          <p className="text-lg font-bold num">{l.priceAmount ? `${formatPKR(l.priceAmount)} (${t(`price.${l.priceType === "on_contact" ? "onContact" : l.priceType}`)})` : t(`price.${l.priceType === "on_contact" ? "onContact" : l.priceType}`)}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-muted">{t("listing.views")} / {t("listing.contacts")}</p>
          <p className="text-lg font-bold num">
            {l.viewCount} / {l.contactClickCount}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-muted">{t("listing.expires")}</p>
          <p className="text-lg font-bold num">{l.expiresAt ? formatDate(l.expiresAt, locale) : "—"}</p>
        </div>
      </div>
      {images.length > 0 && (
        <ul className="mt-4 flex gap-2 overflow-x-auto">
          {images.map((i) => (
            <li key={i.id} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/files/public/${i.storagePath}`} alt={i.altText ?? ""} className="h-24 w-32 rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      )}
      {l.description && <p className="mt-4 whitespace-pre-line text-text">{l.description}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {l.status === "published" && <LinkButton href={`/listings/${l.slug}`} variant="secondary">{t("mylist.preview")}</LinkButton>}
        <LinkButton href="/dashboard/seller/listings/new" variant="outline">
          {t("mylist.addAnother")}
        </LinkButton>
        <Link href="/dashboard/seller/listings" className="self-center font-semibold text-primary underline-offset-2 hover:underline">
          ‹ {t("mylist.title")}
        </Link>
      </div>
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">{t("mylist.statusHistory")}</h2>
        <ol className="card divide-y divide-border">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <Badge tone={listingStatusTone(h.newStatus)}>{t(`listing.status.${h.newStatus}`)}</Badge>
                {h.reason && <span className="ms-2 text-text-muted">{h.reason}</span>}
              </span>
              <span className="text-text-muted num">{formatDateTime(h.createdAt, locale)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
