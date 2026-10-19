import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getBusinessDocuments, getOpenVerification, getVerificationHistory } from "@/lib/business/queries";
import { documentTypeEnum } from "@/db/schema";
import { MAX_DOCUMENT_BYTES } from "@/lib/storage/images";
import { Badge, verificationTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { VerificationForm } from "@/components/seller/verification-form";
import { formatDateTime } from "@/lib/utils/format";

export default async function VerificationPage() {
  const { business, t, locale } = await getSellerContext("/dashboard/seller/verification");
  if (!business) redirect("/dashboard/seller");
  const [open, history, docs] = await Promise.all([getOpenVerification(business.id), getVerificationHistory(business.id), getBusinessDocuments(business.id)]);
  const types = documentTypeEnum.enumValues.map((v) => ({ value: v, label: t(`verify.doc.${v}`) }));
  const statusTone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : s === "more_info_requested" ? "warning" : "info") as "success" | "danger" | "warning" | "info";
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t("verify.title")}</h1>
      <p className="mt-1 text-text-muted">{t("verify.sub")}</p>
      <div className="card mt-5 p-5">
        <p className="text-sm font-semibold text-text-muted">{t("verify.current")}</p>
        <p className="mt-1">
          <Badge tone={verificationTone(business.verificationLevel)} className="text-base">
            {t(`supplier.verification.${business.verificationLevel}`)}
          </Badge>
        </p>
        <h2 className="mt-4 font-bold">{t("verify.whatChecked")}</h2>
        <ul className="mt-1 list-disc space-y-1 ps-5 text-[0.95rem] text-text-muted">
          <li>{t("verify.check1")}</li>
          <li>{t("verify.check2")}</li>
          <li>{t("verify.check3")}</li>
        </ul>
        <p className="mt-3 text-sm text-text-muted">{t("verify.retention")}</p>
      </div>

      <section className="card mt-5 p-5">
        <h2 className="text-lg font-bold">{t("verify.request")}</h2>
        {open ? (
          <Alert tone={statusTone(open.status)} className="mt-3" title={t(`verify.status.${open.status}`)}>
            {open.status === "more_info_requested" && open.reviewReason ? open.reviewReason : t("verify.openRequest")}
            {open.status === "more_info_requested" && <p className="mt-2 text-sm">{t("verify.docsHint", { size: Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024) })}</p>}
          </Alert>
        ) : business.verificationLevel === "documents_reviewed" || business.verificationLevel === "admin_verified" ? (
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
        <section className="mt-5">
          <h2 className="mb-2 text-lg font-bold">{t("verify.uploaded")}</h2>
          <p className="mb-2 text-sm text-text-muted">{t("supplier.documentsNote")}</p>
          <ul className="card divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span>
                  📄 {t(`verify.doc.${d.documentType}`)} — {d.originalFilename}
                </span>
                <span className="text-text-muted num">{formatDateTime(d.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-lg font-bold">{t("verify.history")}</h2>
          <ol className="card divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={statusTone(h.status)}>{t(`verify.status.${h.status}`)}</Badge>
                  <span className="text-text-muted num">{formatDateTime(h.createdAt, locale)}</span>
                </div>
                {h.reviewReason && (
                  <p className="mt-1 text-text-muted">
                    {t("verify.reviewerReason")}: {h.reviewReason}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
