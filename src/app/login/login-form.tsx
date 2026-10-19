"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtpAction, verifyOtpAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { formatPhoneDisplay } from "@/lib/utils/phone";

export function LoginForm({ next, otpConfigured }: { next: string; otpConfigured: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [reqState, reqAction, reqPending] = useActionState(requestOtpAction, null);
  const [verState, verAction, verPending] = useActionState(verifyOtpAction, null);
  const [cooldown, setCooldown] = useState(0);
  const [phoneInput, setPhoneInput] = useState("");

  const sent = reqState?.ok ? reqState.data : null;

  useEffect(() => {
    if (sent) setCooldown(sent.cooldownSeconds);
  }, [sent]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  useEffect(() => {
    if (verState?.ok) router.replace(verState.data!.next);
  }, [verState, router]);

  function reqError(): string | null {
    if (!reqState || reqState.ok) return null;
    if (reqState.error.startsWith("cooldown:")) return t("auth.resendIn", { seconds: reqState.error.split(":")[1] });
    if (reqState.error === "rate_limited") return t("auth.tooMany");
    if (reqState.error === "not_configured") return t("auth.deliveryNotConfigured");
    return t("auth.invalidPhone");
  }
  function verError(): string | null {
    if (!verState || verState.ok) return null;
    if (verState.error.startsWith("invalid_code:")) return t("auth.invalidCode", { remaining: verState.error.split(":")[1] });
    if (verState.error === "too_many") return t("auth.tooMany");
    if (verState.error === "suspended") return t("error.forbidden");
    return t("auth.expired");
  }

  if (!sent) {
    return (
      <form action={reqAction} noValidate>
        {!otpConfigured && <Alert tone="warning" className="mb-4">{t("auth.deliveryNotConfigured")}</Alert>}
        <Field label={t("auth.phoneLabel")} required htmlFor="phone" error={reqError()}>
          <div className="flex items-stretch gap-2" dir="ltr">
            <span className="inline-flex items-center rounded-[var(--radius)] border border-border-strong bg-surface-muted px-3 font-semibold font-latin">+92</span>
            <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t("auth.phonePlaceholder")} required value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} aria-invalid={Boolean(reqError()) || undefined} className="font-latin" />
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={reqPending}>
          {t("action.sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <form action={verAction} noValidate>
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="next" value={next} />
      <Alert tone={sent.delivery === "sent" ? "success" : "warning"} className="mb-4">
        {sent.delivery === "sent" ? t("auth.codeSent", { phone: formatPhoneDisplay(sent.phone) }) : `${t("auth.deliveryNotConfigured")} ${sent.deliveryError ?? ""}`}
        <span className="block text-sm text-text-muted">{t("auth.codeHint", { minutes: Math.round(sent.expiresInSeconds / 60) })}</span>
      </Alert>
      <Field label={t("auth.codeLabel")} required htmlFor="code" error={verError()}>
        <Input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required autoFocus className="text-center text-2xl tracking-[0.5em] font-latin" aria-invalid={Boolean(verError()) || undefined} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={verPending}>
        {t("action.verify")}
      </Button>
      <form action={reqAction} className="mt-3 text-center">
        <input type="hidden" name="phone" value={sent.phone} />
        <Button type="submit" variant="ghost" disabled={cooldown > 0} loading={reqPending}>
          {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("action.resend")}
        </Button>
      </form>
    </form>
  );
}
