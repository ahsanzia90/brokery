"use client";
import { useActionState } from "react";
import { requestMissingCommodityAction } from "@/lib/search/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export function MissingCommodityForm({ initialName }: { initialName: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(requestMissingCommodityAction, null);
  if (state?.ok) return <Alert tone="success">{t("browse.missingSuccess")}</Alert>;
  return (
    <form action={action} className="rounded-[var(--r-xl)] border border-line bg-surface p-6 md:p-8" noValidate>
      <h2 className="mb-1 text-[20px] font-bold text-ink">{t("browse.missingTitle")}</h2>
      <p className="mb-4 text-[14px] text-muted">{t("search.addMissing")}</p>
      {state && !state.ok && <Alert tone="danger" className="mb-3">{state.error === "rate_limited" ? t("error.rateLimited") : t("form.fixErrors")}</Alert>}
      <Field label={t("browse.missingName")} required htmlFor="missing-name" error={state && !state.ok && state.fieldErrors?.name ? t("form.required") : null}>
        <Input id="missing-name" name="name" defaultValue={initialName} required minLength={2} maxLength={120} />
      </Field>
      <Field label={`${t("browse.missingNotes")} (${t("common.optional")})`} htmlFor="missing-notes">
        <Textarea id="missing-notes" name="notes" rows={3} maxLength={1000} />
      </Field>
      <div className="hidden" aria-hidden>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" loading={pending} variant="outline">
        {t("action.submit")}
      </Button>
    </form>
  );
}
