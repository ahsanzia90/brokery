"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { requestVerificationAction } from "@/lib/business/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { BusinessDocumentUploader, type BusinessDoc } from "./uploaders";

export function VerificationForm({ maxBytes, types }: { maxBytes: number; types: Array<{ value: string; label: string }> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [docs, setDocs] = useState<BusinessDoc[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <Alert tone="success">{t("verify.submitted")}</Alert>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!docs.length) {
          setError(t("verify.docsHint", { size: Math.round(maxBytes / 1024 / 1024) }));
          return;
        }
        start(async () => {
          const res = await requestVerificationAction({ documentIds: docs.map((d) => d.id), applicantNotes: notes || null });
          if (res.ok) {
            setDone(true);
            router.refresh();
          } else setError(res.error === "open_request" ? t("verify.openRequest") : t("common.error"));
        });
      }}
    >
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <fieldset className="mb-5">
        <legend className="mb-2 text-[14px] font-semibold text-ink">{t("verify.docs")}</legend>
        <BusinessDocumentUploader docs={docs} onChange={setDocs} maxBytes={maxBytes} types={types} />
      </fieldset>
      <Field label={t("verify.notes")} htmlFor="vnotes" hint={t("common.optional")}>
        <Textarea id="vnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
      </Field>
      <Button type="submit" size="lg" loading={pending} disabled={docs.length === 0}>
        {t("verify.request")}
      </Button>
    </form>
  );
}
