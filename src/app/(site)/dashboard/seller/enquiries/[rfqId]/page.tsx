import { CommodityVisual } from "@/components/marketplace/commodity-visual";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MessageCircle, PhoneCall } from "lucide-react";
import { getSellerContext } from "@/lib/business/context";
import { getIncomingRfqDetail, markRecipientViewed } from "@/lib/business/quote-service";
import { getUnits } from "@/lib/data/taxonomy";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { QuoteForm } from "@/components/seller/quote-form";
import { Facts } from "@/components/flows/form-section";
import { artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";
import { formatQuantity } from "@/lib/utils/format";
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
  const artKey = artKeyFor(d.commodity.slug ?? null, d.commodity.nameEn);
  const facts = [
    { label: t("common.commodity"), value: [name(d.commodity), d.varietyName, d.gradeName, d.rfq.customSpecification].filter(Boolean).join(" · ") },
    { label: t("common.quantity"), value: <span className="num">{formatQuantity(d.rfq.quantity, d.unitSymbol)}</span> },
    { label: t("common.city"), value: d.city ? name(d.city) : null },
    { label: t("rfq.requiredBy"), value: d.rfq.requiredBy ? formatDate(d.rfq.requiredBy, locale) : null },
    { label: t("enq.targetPrice"), value: d.rfq.targetPrice ? <span className="num">{formatPKR(d.rfq.targetPrice)}{d.targetUnitSymbol ? ` / ${d.targetUnitSymbol}` : ""}</span> : null },
    { label: t("enq.quality"), value: d.rfq.qualityRequirements },
  ].filter((f) => f.value);
  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/seller/enquiries" className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("enq.title")}
      </Link>
      <header className="flex gap-4 border-b border-line pb-5">
        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--r-md)] ${artTint[artKey]}`}>
          <CommodityVisual artKey={artKey} className="h-11 w-11" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {d.isDirect ? <Badge tone="accent">{t("enq.direct")}</Badge> : <Badge tone="info">{t("enq.matched")}</Badge>}
            <Badge tone={rfqStatusTone(d.rfq.status)}>{t(`rfq.status.${d.rfq.status}`)}</Badge>
          </div>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight text-ink">
            {t("enq.needs", { name: d.buyerFirstName })} {name(d.commodity)}
          </h1>
          <p className="mt-1 text-[13px] text-muted num">
            <span className="font-latin">{d.rfq.reference}</span> · {formatDate(d.rfq.createdAt, locale)}
          </p>
        </div>
      </header>

      <div className="mt-6">
        <Facts columns={2} items={facts} />
        {d.rfq.notes && (
          <div className="mt-5 rounded-[var(--r-md)] bg-tint-sand px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("common.notes")}</p>
            <p className="mt-1 whitespace-pre-line text-[15px] text-ink-2">{d.rfq.notes}</p>
          </div>
        )}
      </div>

      <section className="mt-6 border-t border-line pt-5">
        <h2 className="text-[14px] font-bold uppercase tracking-wide text-muted">{t("enq.buyerContact")}</h2>
        {!d.buyerAllowsContact ? (
          <p className="mt-2 text-[14px] text-muted">{t("enq.platformOnly")}</p>
        ) : d.buyerPhone ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${d.buyerPhone}`} className={buttonClass("primary", "md")}>
              <PhoneCall className="h-4 w-4" aria-hidden /> {t("action.call")} <span className="font-latin">{formatPhoneDisplay(d.buyerPhone)}</span>
            </a>
            {(d.contactPreference === "whatsapp" || d.contactPreference === "any") && (
              <a href={whatsappLink(d.buyerPhone, `${d.rfq.reference}: ${name(d.commodity)}`)} target="_blank" rel="noopener" className={buttonClass("outline", "md")}>
                <MessageCircle className="h-4 w-4" aria-hidden /> {t("action.whatsapp")}
              </a>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-muted">{t("enq.contactAfterReply")}</p>
        )}
      </section>

      {d.recipient?.state === "declined" && <Alert tone="warning" className="mt-5">{t("enq.declined")}</Alert>}
      <div className="mt-6">
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
