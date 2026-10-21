"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { joinRfqAction } from "@/lib/rfq/quote-actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function JoinRfqButton({ rfqId, label }: { rfqId: string; label: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-5">
      {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await joinRfqAction(rfqId);
            if (res.ok) router.refresh();
            else setError(res.error === "closed" ? t("enq.closed") : t("common.error"));
          })
        }
      >
        {label} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Button>
    </div>
  );
}
