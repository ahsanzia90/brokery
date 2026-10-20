import Link from "next/link";
import { ArrowRight, Briefcase, ClipboardCheck, Inbox, ShieldCheck } from "lucide-react";
import { getSellerContext } from "@/lib/business/context";
import { getBusinessStats } from "@/lib/business/queries";
import { getSellerListings } from "@/lib/listings/service";
import { getIncomingRfqs } from "@/lib/business/quote-service";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { VerificationLabel } from "@/components/marketplace/cards";
import { AttentionList, DashHeader, StatStrip } from "@/components/flows/dashboard-shell";
import { SellerListingRow } from "@/components/flows/listing-row";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { formatNumber, formatDate } from "@/lib/utils/format";

export default async function SellerOverviewPage() {
  const { user, business, t, locale } = await getSellerContext("/dashboard/seller");
  if (!business) {
    return (
      <div>
        <DashHeader title={t("seller.welcome", { name: user.name || "" })} />
        <div className="panel panel-mint max-w-2xl">
          <span className="step-no">01.</span>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-ink">{t("seller.noBusinessTitle")}</h2>
          <p className="mt-2 max-w-md text-[15px] text-ink-2">{t("seller.noBusinessBody")}</p>
          <LinkButton href="/dashboard/seller/business" size="lg" className="mt-6">
            {t("dash.setupBusiness")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </LinkButton>
        </div>
      </div>
    );
  }
  const [stats, recent, rfqsNew] = await Promise.all([getBusinessStats(business.id), getSellerListings(business.id), getIncomingRfqs(business.id, "new")]);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);

  const attention: Array<{ label: string; href: string; Icon: typeof Inbox; tone?: "warning" | "info" | "success" }> = [];
  if (rfqsNew.length) attention.push({ label: t("dash.attn.newRfqs", { count: rfqsNew.length }), href: "/dashboard/seller/enquiries", Icon: Inbox, tone: "success" });
  if (stats.pending) attention.push({ label: t("dash.attn.pendingListings", { count: stats.pending }), href: "/dashboard/seller/listings?status=pending_review", Icon: ClipboardCheck, tone: "warning" });
  if (business.verificationLevel === "none" || business.verificationLevel === "phone_verified") attention.push({ label: t("dash.attn.notVerified"), href: "/dashboard/seller/verification", Icon: ShieldCheck, tone: "info" });
  if (!business.description) attention.push({ label: t("dash.attn.noBusiness"), href: "/dashboard/seller/business", Icon: Briefcase, tone: "info" });

  return (
    <div>
      <DashHeader
        eyebrow={t("dash.seller.title")}
        title={business.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <VerificationLabel level={business.verificationLevel} t={t} />
            <Link href={`/supplier/${business.slug}`} className="text-[13px] font-semibold text-brand-800 hover:underline">
              {t("seller.viewPublic")} ›
            </Link>
          </span>
        }
        actions={
          <LinkButton href="/dashboard/seller/listings/new" size="md">
            {t("action.createListing")}
          </LinkButton>
        }
      />

      <StatStrip
        items={[
          { label: t("seller.stats.published"), value: formatNumber(stats.published), href: "/dashboard/seller/listings?status=published" },
          { label: t("seller.stats.pending"), value: formatNumber(stats.pending), href: "/dashboard/seller/listings?status=pending_review", tone: stats.pending ? "warning" : "default" },
          { label: t("seller.stats.views"), value: formatNumber(stats.views) },
          { label: t("seller.stats.contacts"), value: formatNumber(stats.contactClicks) },
          { label: t("seller.stats.openRfqs"), value: formatNumber(stats.openRfqs), href: "/dashboard/seller/enquiries" },
          { label: t("seller.stats.quotes"), value: formatNumber(stats.quotesSent), href: "/dashboard/seller/enquiries?tab=responded" },
        ]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">{t("seller.recentListings")}</h2>
              <Link href="/dashboard/seller/listings" className="text-[13px] font-semibold text-brand-800 hover:underline">
                {t("action.viewAll")} ›
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState compact title={t("listing.noListings")} action={<LinkButton href="/dashboard/seller/listings/new" size="sm">{t("action.createListing")}</LinkButton>} />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {recent.slice(0, 5).map((r) => (
                  <SellerListingRow
                    key={r.l.id}
                    t={t}
                    href={`/dashboard/seller/listings/${r.l.id}`}
                    l={{ id: r.l.id, title: r.l.title, status: r.l.status, statusReason: r.l.statusReason, priceType: r.l.priceType, priceAmount: r.l.priceAmount, quantity: r.l.quantity, unitSymbol: r.unitSymbol, cityName: name({ nameEn: r.cityName ?? "", nameUr: r.cityNameUr }) || null, commodityName: r.commodityName, image: r.image, viewCount: r.l.viewCount, contactClickCount: r.l.contactClickCount }}
                    actions={<ListingRowActions id={r.l.id} status={r.l.status} compact />}
                  />
                ))}
              </ul>
            )}
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">{t("seller.recentRfqs")}</h2>
              <Link href="/dashboard/seller/enquiries" className="text-[13px] font-semibold text-brand-800 hover:underline">
                {t("action.viewAll")} ›
              </Link>
            </div>
            {rfqsNew.length === 0 ? (
              <EmptyState compact title={t("rfq.noIncoming")} body={t("biz.commoditiesHint")} />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {rfqsNew.slice(0, 5).map((r) => (
                  <li key={r.rfqId}>
                    <Link href={`/dashboard/seller/enquiries/${r.rfqId}`} className="flex items-center justify-between gap-3 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-ink">
                          {t("enq.needs", { name: r.buyerFirstName })} {name({ nameEn: r.commodityName, nameUr: r.commodityNameUr })} · <span className="num">{formatNumber(r.quantity)} {r.unitSymbol}</span>
                        </span>
                        <span className="block text-[13px] text-muted num">
                          {r.cityName ? `${name({ nameEn: r.cityName, nameUr: r.cityNameUr })} · ` : ""}
                          {formatDate(r.createdAt, locale)}
                        </span>
                      </span>
                      {r.isDirect ? <Badge tone="accent">{t("enq.direct")}</Badge> : <Badge tone="info">{t("enq.matched")}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <AttentionList title={t("dash.needsAttention")} items={attention} allClear={t("dash.allClear")} />
      </div>
    </div>
  );
}
