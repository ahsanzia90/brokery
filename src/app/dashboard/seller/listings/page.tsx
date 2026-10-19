import Link from "next/link";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getSellerListings } from "@/lib/listings/service";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { formatDate, formatNumber } from "@/lib/utils/format";

const TABS = ["all", "published", "pending_review", "draft", "paused", "expired", "rejected", "sold_out"] as const;

export default async function SellerListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { business, t, locale } = await getSellerContext("/dashboard/seller/listings");
  if (!business) redirect("/dashboard/seller");
  const tab = (TABS as readonly string[]).includes(status ?? "") ? (status as (typeof TABS)[number]) : "all";
  const rows = await getSellerListings(business.id, tab === "all" ? "all" : tab);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("mylist.title")}</h1>
        <LinkButton href="/dashboard/seller/listings/new">+ {t("action.createListing")}</LinkButton>
      </div>
      <nav className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={t("common.status")}>
        <ul className="flex gap-2 whitespace-nowrap">
          {TABS.map((tb) => (
            <li key={tb}>
              <Link href={tb === "all" ? "/dashboard/seller/listings" : `/dashboard/seller/listings?status=${tb}`} aria-current={tab === tb ? "page" : undefined} className={`inline-block min-h-[40px] rounded-full border px-3 py-1.5 text-sm font-semibold ${tab === tb ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
                {tb === "all" ? t("mylist.tab.all") : t(`listing.status.${tb}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon="📦" title={t("listing.noListings")} action={<Link href="/dashboard/seller/listings/new" className="font-semibold text-primary underline">{t("action.createListing")}</Link>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.l.id} className="card p-4">
              <div className="flex gap-4">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/files/public/${r.image}`} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-3xl" aria-hidden>
                    📦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/seller/listings/${r.l.id}`} className="font-bold hover:text-primary">
                      {r.l.title}
                    </Link>
                    <Badge tone={listingStatusTone(r.l.status)}>{t(`listing.status.${r.l.status}`)}</Badge>
                  </div>
                  <p className="text-sm text-text-muted num">
                    {name({ nameEn: r.commodityName, nameUr: r.commodityNameUr })} · {formatNumber(r.l.quantity)} {r.unitSymbol}
                    {r.cityName ? ` · ${name({ nameEn: r.cityName, nameUr: r.cityNameUr })}` : ""} · {t("listing.views")}: {r.l.viewCount} · {t("listing.contacts")}: {r.l.contactClickCount}
                    {r.l.expiresAt ? ` · ${t("listing.expires")}: ${formatDate(r.l.expiresAt, locale)}` : ""}
                  </p>
                  {r.l.status === "rejected" && r.l.statusReason && (
                    <p className="mt-1 text-sm text-danger">
                      {t("mylist.reason")}: {r.l.statusReason}
                    </p>
                  )}
                  <div className="mt-2">
                    <ListingRowActions listingId={r.l.id} slug={r.l.slug} status={r.l.status} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
