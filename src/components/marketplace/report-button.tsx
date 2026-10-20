"use client";
import { useId, useRef, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { submitReportAction } from "@/lib/reports/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

const REASONS = ["spam", "misleading_price", "fraud", "prohibited_goods", "privacy", "duplicate", "wrong_category", "other"] as const;

export function ReportButton({ kind, id, isGuest, title }: { kind: "listing" | "business"; id: string; isGuest: boolean; title: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const hid = useId();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; ref?: string; error?: string } | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("spam");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-sm)] px-2 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-danger">
        <Flag className="h-4 w-4" aria-hidden /> {t("action.report")}
      </button>
      <dialog ref={ref} className="m-auto w-[min(94vw,480px)] rounded-[var(--r-lg)] border border-line bg-surface p-0 shadow-[var(--shadow-lg)]" aria-labelledby={hid}>
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await submitReportAction({ kind, id, reason, description, contact, website });
              setResult(res.ok ? { ok: true, ref: res.data!.reference } : { ok: false, error: res.error });
            });
          }}
        >
          <h2 id={hid} className="text-[18px] font-bold text-ink">
            {title}
          </h2>
          {result?.ok ? (
            <Alert tone="success" className="mt-4">
              {t("report.success")} <span className="num font-latin">({result.ref})</span>
            </Alert>
          ) : (
            <>
              {result && !result.ok && <Alert tone="danger" className="mt-3">{result.error === "rate_limited" ? t("error.rateLimited") : t("common.error")}</Alert>}
              <div className="mt-4">
                <Field label={t("report.reason")} required htmlFor={`${hid}-reason`}>
                  <Select id={`${hid}-reason`} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`report.reason.${r}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={`${t("report.details")} (${t("common.optional")})`} htmlFor={`${hid}-desc`}>
                  <Textarea id={`${hid}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} />
                </Field>
                {isGuest && (
                  <Field label={`${t("common.phone")} / ${t("common.email")} (${t("common.optional")})`} htmlFor={`${hid}-contact`}>
                    <Input id={`${hid}-contact`} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} className="font-latin" />
                  </Field>
                )}
                <div className="hidden" aria-hidden>
                  <label>
                    Website <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                </div>
              </div>
            </>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
              {t("action.close")}
            </Button>
            {!result?.ok && (
              <Button type="submit" variant="danger" loading={pending}>
                {t("action.report")}
              </Button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
