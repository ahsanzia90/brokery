"use client";
import { useActionState } from "react";
import { submitContactAction } from "@/lib/support/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export function ContactForm({ defaults }: { defaults: { name: string; contact: string } }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(submitContactAction, null);
  if (state?.ok) {
    return (
      <Alert tone="success" title={t("common.success")}>
        {t("contact.success", { ref: state.data?.reference ?? "" })}
      </Alert>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="card p-5" noValidate>
      {state && !state.ok && <Alert tone="danger" className="mb-4">{state.error === "rate_limited" ? t("error.rateLimited") : t("form.fixErrors")}</Alert>}
      <Field label={t("common.name")} required htmlFor="c-name" error={fe.name ? t("form.required") : null}>
        <Input id="c-name" name="name" defaultValue={defaults.name} required minLength={2} maxLength={80} autoComplete="name" />
      </Field>
      <Field label={t("browse.contactHow")} required htmlFor="c-contact" error={fe.contact ? t("form.invalid") : null}>
        <Input id="c-contact" name="contact" defaultValue={defaults.contact} required minLength={5} maxLength={200} className="font-latin" />
      </Field>
      <Field label={t("contact.subject")} required htmlFor="c-subject" error={fe.subject ? t("form.required") : null}>
        <Input id="c-subject" name="subject" required minLength={3} maxLength={150} />
      </Field>
      <Field label={t("contact.message")} required htmlFor="c-message" error={fe.message ? t("form.min", { min: 10 }) : null}>
        <Textarea id="c-message" name="message" required minLength={10} maxLength={4000} rows={6} />
      </Field>
      <div className="hidden" aria-hidden>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" loading={pending}>
        {t("action.submit")}
      </Button>
    </form>
  );
}
