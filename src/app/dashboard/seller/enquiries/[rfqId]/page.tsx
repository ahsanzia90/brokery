import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getIncomingRfqDetail, markRecipientViewed } from "@/lib/business/quote-service";
import { getUnits } from "@/lib/data/taxonomy";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { QuoteForm } from "@/components/seller/quote-form";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";
import { formatPhoneDisplay, whatsappLink } from "@/lib/utils/phone";

export default async function SellerEnquiryDetailPage({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  const { user, business, t, locale } = await getSellerContext(`/dashboard/seller/enquiries/${rfqId}`);
  if (!business) redirect("/dashboard/seller");
  const actor = { userId: user.id, businessId: business.id };
  const d = await getIncomingRfqDetail(actor, rfqId);
  if (!d) notFound();
  await markRecipientViewed(actor, rfqId);
  const units = await getUnits();
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  const rows: Array<[string, string | null]> = [
    [t("common.commodity"), [name(d.commodity), d.varietyName, d.gradeName, d.rfq.customSpecification].filter(Boolean).join(" · ")],
    [t("common.quantity"), `${formatNumber(d.rfq.quantity)} ${d.unitSymbol}`],
    [t("common.city"), d.city ? name(d.city) : null],
    [t("rfq.requiredBy"), d.rfq.requiredBy ? formatDate(d.rfq.requiredBy, locale) : null],
    [t("enq.targetPrice"), d.rfq.targetPrice ? `${formatPKR(d.rfq.targetPrice)}${d.targetUnitSymbol ? ` / ${d.targetUnitSymbol}` : ""}` : null],
    [t("enq.quality"), d.rfq.qualityRequirements],
    [t("common.notes"), d.rfq.notes],
  ];
  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/seller/enquiries" className="text-sm font-semibold text-primary">
        ‹ {t("enq.title")}
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {t("enq.needs", { name: d.buyerFirstName })}: {name(d.commodity)}
        </h1>
        <div className="flex gap-2">
          {d.isDirect ? <Badge tone="accent">{t("enq.direct")}</Badge> : <Badge tone="neutral">{t("enq.matched")}</Badge>}
          <Badge tone={rfqStatusTone(d.rfq.status)}>{t(`rfq.status.${d.rfq.status}`)}</Badge>
        </div>
      </div>
      <p className="text-sm text-text-muted num">
        {t("enq.reference")}: {d.rfq.reference} · {formatDate(d.rfq.createdAt, locale)}
      </p>
      <dl className="card mt-4 divide-y divide-border">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-sm font-semibold text-text-muted">{k}</dt>
              <dd className="whitespace-pre-line num">{v}</dd>
            </div>
          ))}
      </dl>

      <section className="card mt-4 p-4">
        <h2 className="font-bold">{t("enq.buyerContact")}</h2>
        {!d.buyerAllowsContact ? (
          <p className="mt-1 text-text-muted">{t("enq.platformOnly")}</p>
        ) : d.buyerPhone ? (
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={`tel:${d.buyerPhone}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-[var(--radius)] bg-primary px-4 font-semibold text-white">
              📞 {t("action.call")} <span className="font-latin">{formatPhoneDisplay(d.buyerPhone)}</span>
            </a>
            {(d.contactPreference === "whatsapp" || d.contactPreference === "any") && (
              <a href={whatsappLink(d.buyerPhone, `${d.rfq.reference}: ${name(d.commodity)}`)} target="_blank" rel="noopener" className="inline-flex min-h-[48px] items-center gap-2 rounded-[var(--radius)] border border-primary px-4 font-semibold text-primary">
                💬 {t("action.whatsapp")}
              </a>
            )}
          </div>
        ) : (
          <p className="mt-1 text-text-muted">{t("enq.contactAfterReply")}</p>
        )}
      </section>

      {d.recipient?.state === "declined" && <Alert tone="warning" className="mt-4">{t("enq.declined")}</Alert>}
      <div className="mt-4">
        <QuoteForm
          rfqId={rfqId}
          units={units.map((u) => ({ id: u.id, symbol: u.symbol, nameEn: u.nameEn, nameUr: u.nameUr }))}
          defaultUnitId={d.rfq.unitId}
          existing={d.quote ? { priceAmount: d.quote.priceAmount, priceUnitId: d.quote.priceUnitId, quantity: d.quote.quantity, quantityUnitId: d.quote.quantityUnitId, validUntil: d.quote.validUntil, deliveryTerms: d.quote.deliveryTerms, notes: d.quote.notes, status: d.quote.status } : null}
          isOpen={d.isOpen}
        />
      </div>
    </div>
  );
}
