"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revealContactAction, type RevealInput, type RevealResult } from "@/lib/contact/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

type Props = {
  businessId: string;
  listingId?: string | null;
  rfqId?: string | null;
  quoteId?: string | null;
  phoneAvailable: boolean;
  whatsappAvailable: boolean;
  size?: "md" | "lg";
  className?: string;
};

/**
 * Call / WhatsApp buttons. The number is revealed only after a click (consent-checked
 * and rate-limited on the server) so contact details are never in the page source.
 */
export function ContactButtons({ businessId, listingId, rfqId, quoteId, phoneAvailable, whatsappAvailable, size = "lg", className }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [revealed, setRevealed] = useState<Partial<Record<"phone" | "whatsapp", RevealResult>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"phone" | "whatsapp" | null>(null);

  if (!phoneAvailable && !whatsappAvailable && !rfqId) {
    return <p className={`text-text-muted ${className ?? ""}`}>{t("supplier.contactHidden")}</p>;
  }

  function reveal(channel: "phone" | "whatsapp") {
    setError(null);
    setBusy(channel);
    start(async () => {
      const input: RevealInput = { businessId, channel, listingId, rfqId, quoteId };
      const res = await revealContactAction(input);
      setBusy(null);
      if (!res.ok) {
        if (res.error === "login_required") {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(res.error === "rate_limited" ? t("error.rateLimited") : res.error === "not_shared" ? t("supplier.contactHidden") : t("common.error"));
        return;
      }
      setRevealed((r) => ({ ...r, [channel]: res.data! }));
      if (channel === "whatsapp") window.open(res.data!.href, "_blank", "noopener");
      else window.location.href = res.data!.href;
    });
  }

  const btn = (channel: "phone" | "whatsapp", label: string, icon: string, variant: "primary" | "accent") => {
    const r = revealed[channel];
    if (r) {
      return (
        <a key={channel} href={r.href} target={channel === "whatsapp" ? "_blank" : undefined} rel="noopener" className={`inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--radius)] border px-5 text-lg font-bold ${variant === "primary" ? "border-primary bg-primary text-white" : "border-[#128c7e] bg-[#128c7e] text-white"}`}>
          <span aria-hidden>{icon}</span>
          <span className="font-latin num" dir="ltr">
            {r.display}
          </span>
        </a>
      );
    }
    return (
      <Button key={channel} type="button" size={size} variant={variant} onClick={() => reveal(channel)} loading={pending && busy === channel} className={variant === "accent" ? "!border-[#128c7e] !bg-[#128c7e] hover:!bg-[#0f7a6d]" : ""}>
        <span aria-hidden>{icon}</span> {label}
      </Button>
    );
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {(phoneAvailable || rfqId) && btn("phone", t("action.call"), "📞", "primary")}
        {(whatsappAvailable || rfqId) && btn("whatsapp", t("action.whatsapp"), "💬", "accent")}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
