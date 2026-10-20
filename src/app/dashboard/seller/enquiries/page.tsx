import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { getSellerContext } from "@/lib/business/context";
import { getIncomingRfqs } from "@/lib/business/quote-service";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { DashHeader, SegmentedTabs } from "@/components/flows/dashboard-shell";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";
import { formatQuantity } from "@/lib/utils/format";

const TABS = ["new", "responded", "declined"] as const;

export default async function SellerEnquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const { business, t, locale } = await getSellerContext("/dashboard/seller/enquiries");
  if (!business) redirect("/dashboard/seller");
  const tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as (typeof TABS)[number]) : "new";
  const [rows, counts] = await Promise.all([getIncomingRfqs(business.id, tab), Promise.all(TABS.map((tb) => getIncomingRfqs(business.id, tb).then((r) => r.length)))]);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  return (
    <div>
      <DashHeader title={t("enq.title")} description={t("enq.sub")} />
      <SegmentedTabs current={tab} tabs={TABS.map((tb, i) => ({ key: tb, href: `/dashboard/seller/enquiries?tab=${tb}`, label: t(`enq.tab.${tb}`), count: counts[i] }))} />
      {rows.length === 0 ? (
        <EmptyState title={t("rfq.noIncoming")} body={t("biz.commoditiesHint")} action={<LinkButton href="/dashboard/seller/business" variant="outline" size="sm">{t("seller.nav.business")}</LinkButton>} />
      ) : (
        <ul className="divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.rfqId}>
              <Link href={`/dashboard/seller/enquiries/${r.rfqId}`} className="flex items-center gap-4 px-4 py-4 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-bold text-ink">
                      {t("enq.needs", { name: r.buyerFirstName })} {name({ nameEn: r.commodityName, nameUr: r.commodityNameUr })}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[13px] font-semibold text-ink-2 num">
                      {formatQuantity(r.quantity, r.unitSymbol)}
                    </span>
                    {r.isDirect ? <Badge tone="accent">{t("enq.direct")}</Badge> : null}
                  </div>
                  <p className="mt-1 text-[13px] text-muted num">
                    {r.cityName ? (
                      <>
                        <MapPin className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> {name({ nameEn: r.cityName, nameUr: r.cityNameUr })} ·{" "}
                      </>
                    ) : null}
                    {formatDate(r.createdAt, locale)}
                    {r.requiredBy ? ` · ${t("rfq.requiredBy")}: ${formatDate(r.requiredBy, locale)}` : ""} · <span className="font-latin">{r.reference}</span>
                  </p>
                  {r.quotePrice && (
                    <p className="mt-1 text-[13px] font-semibold text-brand-900 num">
                      {t("enq.yourOffer")}: {formatPKR(r.quotePrice)} / {r.quoteUnitSymbol}
                      {r.quoteStatus && <span className="font-normal text-muted"> · {t(`rfq.quote.status.${r.quoteStatus}`)}</span>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={rfqStatusTone(r.status)}>{t(`rfq.status.${r.status}`)}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-2 rtl:rotate-180" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
