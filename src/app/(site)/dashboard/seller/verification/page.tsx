import { redirect } from "next/navigation";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { getSellerContext } from "@/lib/business/context";
import { getBusinessDocuments, getOpenVerification, getVerificationHistory } from "@/lib/business/queries";
import { documentTypeEnum } from "@/db/schema";
import { MAX_DOCUMENT_BYTES } from "@/lib/storage/images";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { VerificationLabel } from "@/components/marketplace/cards";
import { VerificationForm } from "@/components/seller/verification-form";
import { DashHeader } from "@/components/flows/dashboard-shell";
import { formatDateTime } from "@/lib/utils/format";

export default async function VerificationPage() {
  const { business, t, locale } = await getSellerContext("/dashboard/seller/verification");
  if (!business) redirect("/dashboard/seller");
  const [open, history, docs] = await Promise.all([getOpenVerification(business.id), getVerificationHistory(business.id), getBusinessDocuments(business.id)]);
  const types = documentTypeEnum.enumValues.map((v) => ({ value: v, label: t(`verify.doc.${v}`) }));
  const statusTone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : s === "more_info_requested" ? "warning" : "info") as "success" | "danger" | "warning" | "info";
  const verified = business.verificationLevel === "documents_reviewed" || business.verificationLevel === "admin_verified";
  const levels = ["phone_verified", "documents_reviewed", "admin_verified"] as const;
  const reached = levels.indexOf(business.verificationLevel as (typeof levels)[number]);

  return (
    <div>
      <DashHeader title={t("verify.title")} description={t("verify.sub")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="max-w-2xl">
          {/* ladder */}
          <ol className="grid gap-3 sm:grid-cols-3">
            {levels.map((lv, i) => {
              const done = i <= reached;
              return (
                <li key={lv} className={`rounded-[var(--r-md)] border p-4 ${done ? "border-brand-100 bg-brand-50" : "border-line bg-surface"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-brand-800 text-white" : "bg-surface-2 text-muted"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <span className="text-[12px] font-bold num">{i + 1}</span>}
                  </span>
                  <p className="mt-2 text-[14px] font-bold text-ink">{t(`supplier.verification.${lv}`)}</p>
                  <p className="mt-1 text-[12px] leading-snug text-muted">{t(`verify.check${i + 1}`).split(":").slice(1).join(":").trim()}</p>
                </li>
              );
            })}
          </ol>

          <section className="mt-8">
            <h2 className="text-[17px] font-bold text-ink">{t("verify.request")}</h2>
            {open ? (
              <Alert tone={statusTone(open.status)} className="mt-3" title={t(`verify.status.${open.status}`)}>
                {open.status === "more_info_requested" && open.reviewReason ? open.reviewReason : t("verify.openRequest")}
                {open.status === "more_info_requested" && <p className="mt-2">{t("verify.docsHint", { size: Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024) })}</p>}
              </Alert>
            ) : verified ? (
              <Alert tone="success" className="mt-3">
                {t(`supplier.verification.${business.verificationLevel}`)}
              </Alert>
            ) : (
              <div className="mt-3">
                <VerificationForm maxBytes={MAX_DOCUMENT_BYTES} types={types} />
              </div>
            )}
            {open?.status === "more_info_requested" && (
              <div className="mt-4">
                <VerificationForm maxBytes={MAX_DOCUMENT_BYTES} types={types} />
              </div>
            )}
          </section>

          {docs.length > 0 && (
            <section className="mt-8 border-t border-line pt-8">
              <h2 className="text-[17px] font-bold text-ink">{t("verify.uploaded")}</h2>
              <p className="mt-1 mb-3 text-[13px] text-muted">{t("supplier.documentsNote")}</p>
              <ul className="divide-y divide-line rounded-[var(--r-md)] border border-line">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-tint-sky text-info">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{t(`verify.doc.${d.documentType}`)}</span>
                      <span className="block truncate text-[12px] text-muted">{d.originalFilename}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-muted num">{formatDateTime(d.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section className="mt-8 border-t border-line pt-8">
              <h2 className="text-[17px] font-bold text-ink">{t("verify.history")}</h2>
              <ol className="mt-3 relative border-s border-line ps-5">
                {history.map((h) => (
                  <li key={h.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -start-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-800 ring-1 ring-line" aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(h.status)}>{t(`verify.status.${h.status}`)}</Badge>
                      <span className="text-[12px] text-muted num">{formatDateTime(h.createdAt, locale)}</span>
                    </div>
                    {h.reviewReason && (
                      <p className="mt-1 text-[14px] text-ink-2">
                        <span className="font-semibold">{t("verify.reviewerReason")}:</span> {h.reviewReason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="self-start rounded-[var(--r-lg)] bg-tint-mint p-5">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">{t("verify.level.current")}</p>
          <div className="mt-2">
            <VerificationLabel level={business.verificationLevel} t={t} />
          </div>
          <h3 className="mt-5 flex items-center gap-2 text-[14px] font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-brand-800" aria-hidden /> {t("verify.whatChecked")}
          </h3>
          <ol className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink-2">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-2">
                <span className="step-no !text-[14px]">0{n}.</span>
                <span>{t(`verify.step.${n}`)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">{t("verify.retention")}</p>
        </aside>
      </div>
    </div>
  );
}
