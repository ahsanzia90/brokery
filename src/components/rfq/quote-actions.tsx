"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { acceptQuoteAction, cancelRfqAction, closeRfqAction, declineQuoteAction } from "@/lib/rfq/actions";
import { contactSupplierForQuoteAction } from "@/lib/rfq/contact-actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { formatPhoneDisplay, whatsappLink } from "@/lib/utils/phone";

export function QuoteActions({ rfqId, quoteId, status, rfqOpen, phone, whatsapp, reference }: { rfqId: string; quoteId: string; status: string; rfqOpen: boolean; phone: string | null; whatsapp: string | null; reference: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [revealed, setRevealed] = useState<"phone" | "whatsapp" | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.push(t("common.success"), "success");
        router.refresh();
      } else toast.push(t("common.error"), "error");
    });

  const canAct = rfqOpen && ["sent", "viewed", "contacted"].includes(status);
  const canDecline = rfqOpen && ["sent", "viewed", "contacted", "accepted"].includes(status);

  async function contact(channel: "phone" | "whatsapp") {
    const res = await contactSupplierForQuoteAction(rfqId, quoteId, channel);
    if (!res.ok) {
      toast.push(t("common.error"), "error");
      return;
    }
    setRevealed(channel);
    router.refresh();
    if (channel === "whatsapp" && whatsapp) window.open(whatsappLink(whatsapp, `Assalam o Alaikum, I am contacting you about my request ${reference} on MandiLink.`), "_blank", "noopener");
    if (channel === "phone" && phone) window.location.href = `tel:${phone}`;
  }

  return (
    <div className="flex flex-col gap-2">
      {(phone || whatsapp) ? (
        <div className="flex flex-wrap gap-2">
          {phone && (
            <Button type="button" variant="primary" size="md" onClick={() => contact("phone")} disabled={!rfqOpen}>
              📞 {t("action.call")}
              {revealed === "phone" && <span className="font-latin">{formatPhoneDisplay(phone)}</span>}
            </Button>
          )}
          {whatsapp && (
            <Button type="button" variant="secondary" size="md" onClick={() => contact("whatsapp")} disabled={!rfqOpen}>
              💬 {t("action.whatsapp")}
              {revealed === "whatsapp" && <span className="font-latin">{formatPhoneDisplay(whatsapp)}</span>}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{t("rfq.offer.contactHidden")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canAct && (
          <Button type="button" variant="outline" size="sm" loading={pending} onClick={() => run(() => acceptQuoteAction(rfqId, quoteId))}>
            ✅ {t("rfq.offer.accept")}
          </Button>
        )}
        {canDecline && (
          <ConfirmButton title={t("rfq.offer.decline")} confirmLabel={t("action.decline")} cancelLabel={t("action.cancel")} variant="outline" onConfirm={async () => run(() => declineQuoteAction(rfqId, quoteId))}>
            {t("rfq.offer.decline")}
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

export function RfqCloseControls({ rfqId, hasQuotes }: { rfqId: string; hasQuotes: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {hasQuotes ? (
        <ConfirmButton title={t("rfq.closeRequest")} body={t("rfq.closeConfirm")} confirmLabel={t("rfq.closeRequest")} cancelLabel={t("action.cancel")} variant="primary" requireReason={false} reasonLabel={t("rfq.closeReason")} onConfirm={async (reason) => {
          const res = await closeRfqAction(rfqId, reason);
          if (res.ok) router.refresh();
          else toast.push(t("common.error"), "error");
        }}>
          {t("rfq.closeRequest")}
        </ConfirmButton>
      ) : (
        <ConfirmButton title={t("rfq.cancelRequest")} body={t("rfq.cancelConfirm")} confirmLabel={t("rfq.cancelRequest")} cancelLabel={t("action.back")} variant="danger" onConfirm={async () => {
          const res = await cancelRfqAction(rfqId);
          if (res.ok) router.refresh();
          else toast.push(t("common.error"), "error");
        }}>
          {t("rfq.cancelRequest")}
        </ConfirmButton>
      )}
    </div>
  );
}
