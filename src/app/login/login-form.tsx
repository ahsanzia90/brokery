"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { requestOtpAction, verifyOtpAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { formatPhoneDisplay } from "@/lib/utils/phone";

/** Six-box one-time-code input backed by a single hidden field (autofill-friendly). */
function CodeBoxes({ error, label }: { error: boolean; label: string }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const value = digits.join("");
  function setAt(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, j) => (j === i ? "" : x)));
      return;
    }
    // paste or multi-char input: spread across boxes
    setDigits((d) => {
      const next = [...d];
      for (let k = 0; k < clean.length && i + k < 6; k++) next[i + k] = clean[k];
      return next;
    });
    refs.current[Math.min(5, i + clean.length)]?.focus();
  }
  return (
    <div>
      <input type="hidden" name="code" value={value} />
      <div className="flex gap-2" dir="ltr" role="group" aria-label={label}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`${label} ${i + 1}`}
            aria-invalid={error || undefined}
            autoFocus={i === 0}
            maxLength={6}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            className={`h-14 w-full rounded-[var(--r-sm)] border bg-surface text-center text-[24px] font-bold text-ink num focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-800/10 ${error ? "border-danger" : "border-line-strong"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function LoginForm({ next, otpConfigured, demoMode }: { next: string; otpConfigured: boolean; demoMode?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [reqState, reqAction, reqPending] = useActionState(requestOtpAction, null);
  const [verState, verAction, verPending] = useActionState(verifyOtpAction, null);
  const [cooldown, setCooldown] = useState(0);
  const [phoneInput, setPhoneInput] = useState("");
  const [changing, setChanging] = useState(false);

  const sent = reqState?.ok && !changing ? reqState.data : null;

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
      <form
        action={(fd) => {
          setChanging(false);
          reqAction(fd);
        }}
        noValidate
      >
        {!otpConfigured && <Alert tone="warning" className="mb-5">{t("auth.deliveryNotConfigured")}</Alert>}
        {demoMode && <Alert tone="info" className="mb-5">{t("auth.demoMode")}</Alert>}
        <Field label={t("auth.phoneLabel")} required htmlFor="phone" error={reqError()}>
          <div className="flex items-stretch" dir="ltr">
            <span className="inline-flex h-12 items-center gap-1.5 rounded-s-[var(--r-sm)] border border-e-0 border-line-strong bg-surface-2 px-3.5 text-[15px] font-semibold text-ink-2 font-latin">
              <Smartphone className="h-4 w-4 text-muted" aria-hidden /> +92
            </span>
            <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t("auth.phonePlaceholder")} required value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} aria-invalid={Boolean(reqError()) || undefined} className="h-12 rounded-s-none text-[17px] font-latin" />
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={reqPending}>
          {t("action.sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <div>
      <Alert tone={sent.delivery === "sent" ? "success" : "warning"} className="mb-5">
        {sent.delivery === "sent" ? t("auth.codeSent", { phone: formatPhoneDisplay(sent.phone) }) : `${t("auth.deliveryNotConfigured")} ${sent.deliveryError ?? ""}`}
        <span className="block text-[13px] text-muted">{t("auth.codeHint", { minutes: Math.round(sent.expiresInSeconds / 60) })}</span>
      </Alert>
      <form action={verAction} noValidate>
        <input type="hidden" name="phone" value={sent.phone} />
        <input type="hidden" name="next" value={next} />
        <div className="mb-5">
          <Label required>{t("auth.codeLabel")}</Label>
          <CodeBoxes error={Boolean(verError())} label={t("auth.codeLabel")} />
          <FieldError>{verError()}</FieldError>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={verPending}>
          {t("action.verify")}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between gap-3">
        <form action={reqAction}>
          <input type="hidden" name="phone" value={sent.phone} />
          <Button type="submit" variant="ghost" size="sm" disabled={cooldown > 0} loading={reqPending}>
            {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("action.resend")}
          </Button>
        </form>
        <Button type="button" variant="link" size="sm" onClick={() => setChanging(true)}>
          {t("auth.changeNumber")}
        </Button>
      </div>
    </div>
  );
}
