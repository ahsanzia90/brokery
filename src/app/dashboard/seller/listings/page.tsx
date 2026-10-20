import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getSellerListings } from "@/lib/listings/service";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { DashHeader, SegmentedTabs } from "@/components/flows/dashboard-shell";
import { SellerListingRow } from "@/components/flows/listing-row";

const TABS = ["all", "published", "pending_review", "draft", "paused", "expired", "rejected", "sold_out"] as const;

export default async function SellerListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { business, t, locale } = await getSellerContext("/dashboard/seller/listings");
  if (!business) redirect("/dashboard/seller");
  const tab = (TABS as readonly string[]).includes(status ?? "") ? (status as (typeof TABS)[number]) : "all";
  const [rows, all] = await Promise.all([getSellerListings(business.id, tab === "all" ? "all" : tab), tab === "all" ? null : getSellerListings(business.id, "all")]);
  const everything = all ?? rows;
  const countFor = (s: string) => (s === "all" ? everything.length : everything.filter((r) => r.l.status === s).length);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  return (
    <div>
      <DashHeader title={t("mylist.title")} actions={<LinkButton href="/dashboard/seller/listings/new">{t("action.createListing")}</LinkButton>} />
      <SegmentedTabs current={tab} tabs={TABS.filter((tb) => tb === "all" || countFor(tb) > 0 || tb === tab).map((tb) => ({ key: tb, href: tb === "all" ? "/dashboard/seller/listings" : `/dashboard/seller/listings?status=${tb}`, label: tb === "all" ? t("mylist.tab.all") : t(`listing.status.${tb}`), count: countFor(tb) }))} />
      {rows.length === 0 ? (
        <EmptyState title={t("listing.noListings")} action={<LinkButton href="/dashboard/seller/listings/new" size="sm">{t("action.createListing")}</LinkButton>} />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <SellerListingRow
              key={r.l.id}
              t={t}
              href={`/dashboard/seller/listings/${r.l.id}`}
              l={{ id: r.l.id, title: r.l.title, status: r.l.status, statusReason: r.l.statusReason, priceType: r.l.priceType, priceAmount: r.l.priceAmount, quantity: r.l.quantity, unitSymbol: r.unitSymbol, cityName: r.cityName ? name({ nameEn: r.cityName, nameUr: r.cityNameUr }) : null, commodityName: name({ nameEn: r.commodityName, nameUr: r.commodityNameUr }), image: r.image, viewCount: r.l.viewCount, contactClickCount: r.l.contactClickCount }}
              actions={<ListingRowActions listingId={r.l.id} slug={r.l.slug} status={r.l.status} compact />}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
