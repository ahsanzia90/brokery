import Link from "next/link";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getIncomingRfqs } from "@/lib/business/quote-service";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";

const TABS = ["new", "responded", "declined"] as const;

export default async function SellerEnquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const { business, t, locale } = await getSellerContext("/dashboard/seller/enquiries");
  if (!business) redirect("/dashboard/seller");
  const tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as (typeof TABS)[number]) : "new";
  const rows = await getIncomingRfqs(business.id, tab);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  return (
    <div>
      <h1 className="text-2xl font-bold">{t("enq.title")}</h1>
      <p className="mt-1 max-w-2xl text-text-muted">{t("enq.sub")}</p>
      <nav className="my-4 flex gap-2" aria-label={t("common.status")}>
        {TABS.map((tb) => (
          <Link key={tb} href={`/dashboard/seller/enquiries?tab=${tb}`} aria-current={tab === tb ? "page" : undefined} className={`inline-block min-h-[40px] rounded-full border px-4 py-1.5 font-semibold ${tab === tb ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
            {t(`enq.tab.${tb}`)}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon="📨" title={t("rfq.noIncoming")} body={t("biz.commoditiesHint")} action={<Link href="/dashboard/seller/business" className="font-semibold text-primary underline">{t("seller.nav.business")}</Link>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.rfqId} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/dashboard/seller/enquiries/${r.rfqId}`} className="text-lg font-bold hover:text-primary">
                    {t("enq.needs", { name: r.buyerFirstName })}: {name({ nameEn: r.commodityName, nameUr: r.commodityNameUr })} · <span className="num">{formatNumber(r.quantity)} {r.unitSymbol}</span>
                  </Link>
                  <p className="text-sm text-text-muted num">
                    {r.reference} · {r.cityName ? `${name({ nameEn: r.cityName, nameUr: r.cityNameUr })} · ` : ""}
                    {formatDate(r.createdAt, locale)}
                    {r.requiredBy ? ` · ${t("rfq.requiredBy")}: ${formatDate(r.requiredBy, locale)}` : ""}
                  </p>
                  {r.quotePrice && (
                    <p className="mt-1 text-sm font-semibold text-primary-strong num">
                      {t("enq.yourOffer")}: {formatPKR(r.quotePrice)} / {r.quoteUnitSymbol} {r.quoteStatus && <span className="font-normal text-text-muted">· {t(`rfq.quote.status.${r.quoteStatus}`)}</span>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.isDirect ? <Badge tone="accent">{t("enq.direct")}</Badge> : <Badge tone="neutral">{t("enq.matched")}</Badge>}
                  <Badge tone={rfqStatusTone(r.status)}>{t(`rfq.status.${r.status}`)}</Badge>
                </div>
              </div>
              <Link href={`/dashboard/seller/enquiries/${r.rfqId}`} className="mt-2 inline-block min-h-[40px] font-semibold text-primary underline-offset-2 hover:underline">
                {tab === "new" ? t("rfq.respond") : t("common.viewDetails")} ›
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
