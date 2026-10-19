import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getRfqForBuyer, type RfqQuote } from "@/lib/rfq/queries";
import { markAllQuotesViewed, OPEN_RFQ_STATUSES } from "@/lib/rfq/service";
import { Badge, rfqStatusTone, verificationTone } from "@/components/ui/badge";
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
  const eventLabel = (e: { eventType: string; metadata: Record<string, unknown> | null }) => {
    const key = `rfq.event.${e.eventType}`;
    const s = t(key, { count: String(e.metadata?.count ?? "") });
    return s === key ? e.eventType : s;
  };

  return (
    <div className="container-page max-w-3xl py-6">
      <nav className="mb-3 text-sm text-text-muted">
        <Link href="/dashboard/buyer" className="hover:underline">{t("dash.buyer.title")}</Link> › <Link href="/dashboard/buyer/requests" className="hover:underline">{t("rfq.yourRequests")}</Link>
      </nav>
      {created === "1" && (
        <Alert tone="success" title={t("rfq.success")} className="mb-4">
          {t("rfq.successBody", { ref: rfq.reference })}
        </Alert>
      )}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-muted">{t("rfq.ref")}: <span className="font-latin font-semibold">{rfq.reference}</span></p>
          <h1 className="text-2xl font-bold">
            {rfq.commodityName}
            {rfq.varietyName ? ` — ${rfq.varietyName}` : ""}
            {rfq.gradeName ? ` (${rfq.gradeName})` : ""}
          </h1>
          <p className="mt-1 text-text-muted num">
            {formatNumber(rfq.quantity)} {rfq.unitSymbol}
            {rfq.cityName ? ` · ${rfq.cityName}` : ""} · {formatDate(rfq.createdAt, locale)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={rfqStatusTone(rfq.status)}>{t(`rfq.status.${rfq.status}`)}</Badge>
          <span className="text-sm text-text-muted num">{t("rfq.recipientsCount", { count: rfq.recipientCount })}</span>
        </div>
      </header>

      {!isOpen && <Alert tone="warning" className="mb-4">{t("rfq.closedNote")}{rfq.closedReason ? ` (${rfq.closedReason})` : ""}</Alert>}

      <section className="mb-6" aria-labelledby="offers-h">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 id="offers-h" className="text-xl font-bold">
            {t("rfq.offers")} <span className="text-base font-semibold text-text-muted num">({quotes.length})</span>
          </h2>
          {quotes.length > 1 && <p className="text-sm text-text-muted">{mixedUnits ? t("rfq.unitsDiffer") : t("rfq.offersSorted")}</p>}
        </div>
        {quotes.length === 0 ? (
          <EmptyState icon="📨" title={t("rfq.noOffers")} body={t("rfq.afterSubmit")} action={isOpen ? <Link href={`/commodities/${rfq.commoditySlug}`} className="font-semibold text-primary underline">{t("action.findSuppliers")}</Link> : undefined} />
        ) : (
          <ul className="flex flex-col gap-3">
            {quotes.map((q) => (
              <li key={q.id} className={`card p-4 ${q.status === "accepted" ? "border-primary" : q.status === "declined" || q.status === "expired" ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">
                      <Link href={`/supplier/${q.businessSlug}`} className="hover:text-primary">{q.businessName}</Link>
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={verificationTone(q.verificationLevel)}>{t(`supplier.verification.${q.verificationLevel}`)}</Badge>
                      {q.cityName && <span className="text-text-muted">{q.cityName}</span>}
                      <Badge tone={q.status === "accepted" ? "success" : q.status === "declined" || q.status === "expired" ? "neutral" : "info"}>{t(`rfq.quote.status.${q.status}`)}</Badge>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold text-primary-strong num">
                    {q.priceAmount ? (
                      <>
                        {formatPKR(q.priceAmount)} <span className="text-sm font-semibold text-text-muted">/ {q.priceUnitSymbol ?? ""}</span>
                      </>
                    ) : (
                      <span className="text-base">{t("rfq.offer.noPrice")}</span>
                    )}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.95rem] sm:grid-cols-3">
                  {q.quantity && (
                    <div><dt className="text-sm text-text-muted">{t("common.quantity")}</dt><dd className="num">{formatNumber(q.quantity)} {q.quantityUnitSymbol ?? ""}</dd></div>
                  )}
                  {q.validUntil && (
                    <div><dt className="text-sm text-text-muted">{t("rfq.validUntil")}</dt><dd className="num">{formatDate(q.validUntil, locale)}</dd></div>
                  )}
                  {q.deliveryTerms && (
                    <div><dt className="text-sm text-text-muted">{t("rfq.deliveryTerms")}</dt><dd>{q.deliveryTerms}</dd></div>
                  )}
                  <div><dt className="text-sm text-text-muted">{t("common.date")}</dt><dd className="num">{formatDateTime(q.createdAt, locale)}</dd></div>
                </dl>
                {q.notes && <p className="mt-2 whitespace-pre-line text-[0.95rem]">{q.notes}</p>}
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <QuoteActions rfqId={rfq.id} quoteId={q.id} status={q.status} rfqOpen={isOpen} phone={q.phone} whatsapp={q.whatsapp} reference={rfq.reference} />
                  <Link href={`/supplier/${q.businessSlug}`} className="self-end text-sm font-semibold text-primary underline-offset-2 hover:underline">{t("rfq.offer.viewSupplier")} ›</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mb-6 p-5" aria-labelledby="summary-h">
        <h2 id="summary-h" className="mb-3 text-lg font-bold">{t("rfq.summary")}</h2>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <div><dt className="text-sm text-text-muted">{t("common.commodity")}</dt><dd className="font-semibold">{rfq.commodityName}{rfq.varietyName ? ` — ${rfq.varietyName}` : ""}{rfq.gradeName ? ` (${rfq.gradeName})` : ""}</dd></div>
          {rfq.customSpecification && <div><dt className="text-sm text-text-muted">{t("common.grade")}</dt><dd>{rfq.customSpecification}</dd></div>}
          <div><dt className="text-sm text-text-muted">{t("common.quantity")}</dt><dd className="num">{formatNumber(rfq.quantity)} {rfq.unitSymbol}</dd></div>
          <div><dt className="text-sm text-text-muted">{t("common.location")}</dt><dd>{[rfq.marketName, rfq.cityName, rfq.provinceName].filter(Boolean).join(", ") || t("common.any")}</dd></div>
          {rfq.requiredBy && <div><dt className="text-sm text-text-muted">{t("rfq.requiredBy")}</dt><dd className="num">{formatDate(rfq.requiredBy, locale)}</dd></div>}
          {rfq.targetPrice && <div><dt className="text-sm text-text-muted">{t("rfq.targetPrice")}</dt><dd className="num">{formatPKR(rfq.targetPrice)} / {rfq.targetPriceUnitSymbol ?? ""}</dd></div>}
          <div><dt className="text-sm text-text-muted">{t("rfq.contactPref")}</dt><dd>{t(`rfq.contact.${rfq.contactPreference}`)}</dd></div>
          {rfq.targetBusinessName && <div><dt className="text-sm text-text-muted">{t("common.supplier")}</dt><dd><Link href={`/supplier/${rfq.targetBusinessSlug}`} className="text-primary underline">{rfq.targetBusinessName}</Link></dd></div>}
          {rfq.listingSlug && <div><dt className="text-sm text-text-muted">{t("common.listing")}</dt><dd><Link href={`/listings/${rfq.listingSlug}`} className="text-primary underline">{t("common.viewDetails")}</Link></dd></div>}
          {rfq.attributes.map((a) => (
            <div key={a.name}><dt className="text-sm text-text-muted">{a.name}</dt><dd className="num">{a.value}{a.unitLabel ? ` ${a.unitLabel}` : ""}</dd></div>
          ))}
          {rfq.qualityRequirements && <div className="sm:col-span-2"><dt className="text-sm text-text-muted">{t("rfq.quality")}</dt><dd className="whitespace-pre-line">{rfq.qualityRequirements}</dd></div>}
          {rfq.notes && <div className="sm:col-span-2"><dt className="text-sm text-text-muted">{t("common.notes")}</dt><dd className="whitespace-pre-line">{rfq.notes}</dd></div>}
        </dl>
        {isOpen && (
          <div className="mt-4 border-t border-border pt-4">
            <RfqCloseControls rfqId={rfq.id} hasQuotes={rfq.quotes.length > 0} />
          </div>
        )}
      </section>

      <section className="card p-5" aria-labelledby="timeline-h">
        <h2 id="timeline-h" className="mb-3 text-lg font-bold">{t("rfq.timeline")}</h2>
        <ol className="flex flex-col gap-2 text-[0.95rem]">
          {rfq.events.map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              <div>
                <p className="font-medium">{eventLabel(e)}</p>
                <p className="text-sm text-text-muted num">{formatDateTime(e.createdAt, locale)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
