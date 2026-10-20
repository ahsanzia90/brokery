import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getRfqForBuyer, type RfqQuote } from "@/lib/rfq/queries";
import { markAllQuotesViewed, OPEN_RFQ_STATUSES } from "@/lib/rfq/service";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronRight, Inbox } from "lucide-react";
import { VerificationLabel } from "@/components/marketplace/cards";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/utils/format";
import { QuoteActions, RfqCloseControls } from "@/components/rfq/quote-actions";

export const metadata: Metadata = { title: "Buying request", ...NOINDEX };

function sortQuotes(quotes: RfqQuote[]): { quotes: RfqQuote[]; mixedUnits: boolean } {
  const unitIds = new Set(quotes.filter((q) => q.priceAmount).map((q) => q.priceUnitId ?? "none"));
  const mixedUnits = unitIds.size > 1;
  const rank = (s: string) => (s === "accepted" ? 0 : s === "declined" || s === "expired" ? 2 : 1);
  const sorted = [...quotes].sort((a, b) => {
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    if (mixedUnits) return a.createdAt.getTime() - b.createdAt.getTime();
    const pa = a.priceAmount ? Number(a.priceAmount) : Infinity;
    const pb = b.priceAmount ? Number(b.priceAmount) : Infinity;
    return pa - pb;
  });
  return { quotes: sorted, mixedUnits };
}

export default async function RfqDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireUserPage(`/rfq/${id}`);
  const { t, locale } = await getT();
  let rfq = await getRfqForBuyer(id, user.id, locale);
  if (!rfq) notFound();
  if (rfq.quotes.some((q) => q.status === "sent")) {
    await markAllQuotesViewed(id, user.id).catch(() => {});
    rfq = (await getRfqForBuyer(id, user.id, locale)) ?? rfq;
  }
  const isOpen = (OPEN_RFQ_STATUSES as readonly string[]).includes(rfq.status);
  const { quotes, mixedUnits } = sortQuotes(rfq.quotes);
  const ck = artKeyFor(rfq.commoditySlug, rfq.commodityName);
  const eventLabel = (e: { eventType: string; metadata: Record<string, unknown> | null }) => {
    const key = `rfq.event.${e.eventType}`;
    const s = t(key, { count: String(e.metadata?.count ?? "") });
    return s === key ? e.eventType : s;
  };

  return (
    <div className="container-page max-w-5xl py-6 md:py-8">
      <nav className="mb-4 flex items-center gap-1 text-[13px] text-muted">
        <Link href="/dashboard/buyer" className="hover:text-ink">{t("dash.buyer.title")}</Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        <Link href="/dashboard/buyer/requests" className="hover:text-ink">{t("rfq.yourRequests")}</Link>
      </nav>
      {created === "1" && (
        <Alert tone="success" title={t("rfq.success")} className="mb-5">
          {t("rfq.successBody", { ref: rfq.reference })}
        </Alert>
      )}
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--r-md)] ${artTint[ck]}`}>
            <CommodityArt artKey={ck} className="h-11 w-11" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={rfqStatusTone(rfq.status)}>{t(`rfq.status.${rfq.status}`)}</Badge>
              <span className="text-[13px] text-muted font-latin">{rfq.reference}</span>
            </div>
            <h1 className="mt-1 text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">
              {rfq.commodityName}
              {rfq.varietyName ? ` — ${rfq.varietyName}` : ""}
              {rfq.gradeName ? ` (${rfq.gradeName})` : ""}
            </h1>
            <p className="mt-1 text-[14px] text-muted num">
              {formatNumber(rfq.quantity)} {rfq.unitSymbol}
              {rfq.cityName ? ` · ${rfq.cityName}` : ""} · {formatDate(rfq.createdAt, locale)} · {t("rfq.recipientsCount", { count: rfq.recipientCount })}
            </p>
          </div>
        </div>
        {isOpen && <RfqCloseControls rfqId={rfq.id} hasQuotes={rfq.quotes.length > 0} />}
      </header>

      {!isOpen && <Alert tone="warning" className="mt-5">{t("rfq.closedNote")}{rfq.closedReason ? ` (${rfq.closedReason})` : ""}</Alert>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-12">
        <section aria-labelledby="offers-h">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="offers-h" className="text-[20px] font-bold text-ink">
              {t("rfq.offers")} <span className="text-[15px] font-semibold text-muted num">({quotes.length})</span>
            </h2>
            {quotes.length > 1 && <p className="text-[13px] text-muted">{mixedUnits ? t("rfq.unitsDiffer") : t("rfq.offersSorted")}</p>}
          </div>
          {quotes.length === 0 ? (
            <EmptyState icon={<Inbox className="h-5 w-5" />} title={t("rfq.noOffers")} body={t("rfq.afterSubmit")} action={isOpen ? <Link href={`/commodities/${rfq.commoditySlug}`} className={buttonClass("outline", "sm")}>{t("action.findSuppliers")}</Link> : undefined} />
          ) : (
            <ul className="flex flex-col gap-3">
              {quotes.map((q, i) => {
                const muted = q.status === "declined" || q.status === "expired";
                return (
                  <li key={q.id} className={`rounded-[var(--r-lg)] border p-5 ${q.status === "accepted" ? "border-brand-800 bg-brand-50/40 ring-1 ring-brand-800" : "border-line bg-surface"} ${muted ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {i === 0 && !mixedUnits && q.priceAmount && !muted && <span className="rounded-full bg-lime-500 px-2 py-0.5 text-[11px] font-bold text-brand-950">{t("rfq.offer.lowest")}</span>}
                          <h3 className="text-[17px] font-bold text-ink">
                            <Link href={`/supplier/${q.businessSlug}`} className="hover:text-brand-800">{q.businessName}</Link>
                          </h3>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                          <VerificationLabel level={q.verificationLevel} t={t} compact />
                          {q.cityName && <span className="text-muted">{q.cityName}</span>}
                          <Badge tone={q.status === "accepted" ? "success" : muted ? "neutral" : "info"}>{t(`rfq.quote.status.${q.status}`)}</Badge>
                        </div>
                      </div>
                      <p className="text-[24px] font-extrabold leading-none text-ink num">
                        {q.priceAmount ? (
                          <>
                            {formatPKR(q.priceAmount)} <span className="text-[13px] font-semibold text-muted">/ {q.priceUnitSymbol ?? ""}</span>
                          </>
                        ) : (
                          <span className="text-[15px] font-semibold text-muted">{t("rfq.offer.noPrice")}</span>
                        )}
                      </p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-[14px] sm:grid-cols-4">
                      {q.quantity && (
                        <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("common.quantity")}</dt><dd className="mt-0.5 num">{formatNumber(q.quantity)} {q.quantityUnitSymbol ?? ""}</dd></div>
                      )}
                      {q.validUntil && (
                        <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("rfq.validUntil")}</dt><dd className="mt-0.5 num">{formatDate(q.validUntil, locale)}</dd></div>
                      )}
                      {q.deliveryTerms && (
                        <div className="col-span-2"><dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("rfq.deliveryTerms")}</dt><dd className="mt-0.5">{q.deliveryTerms}</dd></div>
                      )}
                      <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("common.date")}</dt><dd className="mt-0.5 num">{formatDate(q.createdAt, locale)}</dd></div>
                    </dl>
                    {q.notes && <p className="mt-3 whitespace-pre-line text-[14px] text-ink-2">{q.notes}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      <QuoteActions rfqId={rfq.id} quoteId={q.id} status={q.status} rfqOpen={isOpen} phone={q.phone} whatsapp={q.whatsapp} reference={rfq.reference} />
                      <Link href={`/supplier/${q.businessSlug}`} className="text-[13px] font-semibold text-brand-800 hover:underline">{t("rfq.offer.viewSupplier")} ›</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-8 lg:self-start">
          <section className="rounded-[var(--r-lg)] bg-tint-sand p-5" aria-labelledby="summary-h">
            <h2 id="summary-h" className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{t("rfq.summary")}</h2>
            <dl className="mt-3 space-y-3 text-[14px]">
              {[
                [t("common.commodity"), `${rfq.commodityName}${rfq.varietyName ? ` — ${rfq.varietyName}` : ""}${rfq.gradeName ? ` (${rfq.gradeName})` : ""}`],
                rfq.customSpecification ? [t("common.grade"), rfq.customSpecification] : null,
                [t("common.quantity"), `${formatNumber(rfq.quantity)} ${rfq.unitSymbol}`],
                [t("common.location"), [rfq.marketName, rfq.cityName, rfq.provinceName].filter(Boolean).join(", ") || t("common.any")],
                rfq.requiredBy ? [t("rfq.requiredBy"), formatDate(rfq.requiredBy, locale)] : null,
                rfq.targetPrice ? [t("rfq.targetPrice"), `${formatPKR(rfq.targetPrice)} / ${rfq.targetPriceUnitSymbol ?? ""}`] : null,
                [t("rfq.contactPref"), t(`rfq.contact.${rfq.contactPreference}`)],
                ...rfq.attributes.map((a) => [a.name, `${a.value}${a.unitLabel ? ` ${a.unitLabel}` : ""}`]),
              ]
                .filter((x): x is string[] => Boolean(x))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] font-semibold text-muted">{k}</dt>
                    <dd className="font-medium text-ink num">{v}</dd>
                  </div>
                ))}
              {rfq.targetBusinessName && (
                <div><dt className="text-[12px] font-semibold text-muted">{t("common.supplier")}</dt><dd><Link href={`/supplier/${rfq.targetBusinessSlug}`} className="font-semibold text-brand-800 underline underline-offset-4">{rfq.targetBusinessName}</Link></dd></div>
              )}
              {rfq.listingSlug && (
                <div><dt className="text-[12px] font-semibold text-muted">{t("common.listing")}</dt><dd><Link href={`/listings/${rfq.listingSlug}`} className="font-semibold text-brand-800 underline underline-offset-4">{t("common.viewDetails")}</Link></dd></div>
              )}
              {rfq.qualityRequirements && <div><dt className="text-[12px] font-semibold text-muted">{t("rfq.quality")}</dt><dd className="whitespace-pre-line">{rfq.qualityRequirements}</dd></div>}
              {rfq.notes && <div><dt className="text-[12px] font-semibold text-muted">{t("common.notes")}</dt><dd className="whitespace-pre-line">{rfq.notes}</dd></div>}
            </dl>
          </section>

          <section aria-labelledby="timeline-h">
            <h2 id="timeline-h" className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{t("rfq.timeline")}</h2>
            <ol className="relative mt-3 border-s border-line ps-5">
              {rfq.events.map((e) => (
                <li key={e.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -start-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-800 ring-1 ring-line" aria-hidden />
                  <p className="text-[14px] font-medium text-ink">{eventLabel(e)}</p>
                  <p className="text-[12px] text-muted num">{formatDateTime(e.createdAt, locale)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
