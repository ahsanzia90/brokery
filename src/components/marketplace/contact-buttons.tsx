"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
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
  stacked?: boolean;
};

/**
 * Call / WhatsApp buttons. The number is revealed only after a click (consent-checked
 * and rate-limited on the server) so contact details are never in the page source.
 */
export function ContactButtons({ businessId, listingId, rfqId, quoteId, phoneAvailable, whatsappAvailable, size = "lg", className, stacked }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [revealed, setRevealed] = useState<Partial<Record<"phone" | "whatsapp", RevealResult>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"phone" | "whatsapp" | null>(null);

  if (!phoneAvailable && !whatsappAvailable && !rfqId) {
    return <p className={`text-[14px] text-muted ${className ?? ""}`}>{t("supplier.contactHidden")}</p>;
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

  const h = size === "lg" ? "h-13 text-base" : "h-11 text-[15px]";
  const btn = (channel: "phone" | "whatsapp", label: string, Icon: typeof Phone, cls: string) => {
    const r = revealed[channel];
    if (r) {
      return (
        <a key={channel} href={r.href} target={channel === "whatsapp" ? "_blank" : undefined} rel="noopener" className={`inline-flex ${h} flex-1 items-center justify-center gap-2 rounded-[var(--r-sm)] px-5 font-bold text-white ${cls}`}>
          <Icon className="h-5 w-5" aria-hidden />
          <span className="font-latin num" dir="ltr">
            {r.display}
          </span>
        </a>
      );
    }
    return (
      <Button key={channel} type="button" size={size} variant="primary" onClick={() => reveal(channel)} loading={pending && busy === channel} className={`flex-1 !border-transparent ${cls}`}>
        <Icon className="h-5 w-5" aria-hidden /> {label}
      </Button>
    );
  };

  return (
    <div className={className}>
      <div className={`flex gap-2 ${stacked ? "flex-col" : "flex-col sm:flex-row"}`}>
        {(phoneAvailable || rfqId) && btn("phone", t("action.call"), Phone, "!bg-brand-800 hover:!bg-brand-900")}
        {(whatsappAvailable || rfqId) && btn("whatsapp", t("action.whatsapp"), MessageCircle, "!bg-[#1a9e60] hover:!bg-[#15804d]")}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
