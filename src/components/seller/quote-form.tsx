"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { declineRfqAction, sendQuoteAction, withdrawQuoteAction } from "@/lib/rfq/quote-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

type UnitOpt = { id: string; symbol: string; nameEn: string; nameUr: string | null };

export function QuoteForm({ rfqId, units, defaultUnitId, existing, isOpen }: { rfqId: string; units: UnitOpt[]; defaultUnitId: string; existing: { priceAmount: string | null; priceUnitId: string | null; quantity: string | null; quantityUnitId: string | null; validUntil: string | null; deliveryTerms: string | null; notes: string | null; status: string } | null; isOpen: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({
    priceAmount: existing?.priceAmount ? String(Number(existing.priceAmount)) : "",
    priceUnitId: existing?.priceUnitId ?? defaultUnitId,
    quantity: existing?.quantity ? String(Number(existing.quantity)) : "",
    quantityUnitId: existing?.quantityUnitId ?? defaultUnitId,
    validUntil: existing?.validUntil ?? "",
    deliveryTerms: existing?.deliveryTerms ?? "",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const uname = (u: UnitOpt) => `${locale === "ur" && u.nameUr ? u.nameUr : u.nameEn} (${u.symbol})`;
  const active = existing && existing.status !== "withdrawn" && existing.status !== "expired";

  if (!isOpen) return <Alert tone="warning">{t("enq.closed")}</Alert>;
  if (sent) return <Alert tone="success">{t("enq.offerSent")}</Alert>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setGeneral(null);
        start(async () => {
          const res = await sendQuoteAction(rfqId, v);
          if (res.ok) {
            setSent(true);
            router.refresh();
          } else {
            const fe: Record<string, string> = {};
            for (const [k, val] of Object.entries(res.fieldErrors ?? {})) fe[k] = val === "price_or_notes" ? t("form.required") : t("form.invalid");
            setErrors(fe);
            setGeneral(res.error === "validation" ? t("form.fixErrors") : res.error === "closed" ? t("enq.closed") : t("common.error"));
          }
        });
      }}
      noValidate
      className="panel panel-mint"
    >
      <h2 className="text-[20px] font-extrabold leading-tight text-ink">{active ? t("enq.updateOffer") : t("rfq.respond")}</h2>
      {general && <Alert tone="danger" className="my-3">{general}</Alert>}
      <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
        <Field label={t("enq.offerPrice")} htmlFor="qp" error={errors.priceAmount}>
          <Input id="qp" type="number" inputMode="decimal" min={0} step="any" className="font-latin text-[18px] font-bold" value={v.priceAmount} onChange={(e) => setV((p) => ({ ...p, priceAmount: e.target.value }))} />
        </Field>
        <Field label={t("wizard.priceUnit")} htmlFor="qpu" error={errors.priceUnitId}>
          <Select id="qpu" value={v.priceUnitId} onChange={(e) => setV((p) => ({ ...p, priceUnitId: e.target.value }))}>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {uname(u)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("enq.offerQty")} htmlFor="qq" error={errors.quantity} hint={t("common.optional")}>
          <Input id="qq" type="number" inputMode="decimal" min={0} step="any" className="font-latin" value={v.quantity} onChange={(e) => setV((p) => ({ ...p, quantity: e.target.value }))} />
        </Field>
        <Field label={t("wizard.unit")} htmlFor="qqu" error={errors.quantityUnitId}>
          <Select id="qqu" value={v.quantityUnitId} onChange={(e) => setV((p) => ({ ...p, quantityUnitId: e.target.value }))}>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {uname(u)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("rfq.validUntil")} htmlFor="qv" hint={t("common.optional")}>
          <Input id="qv" type="date" className="font-latin" value={v.validUntil} onChange={(e) => setV((p) => ({ ...p, validUntil: e.target.value }))} />
        </Field>
        <Field label={t("rfq.deliveryTerms")} htmlFor="qd" hint={t("common.optional")}>
          <Input id="qd" value={v.deliveryTerms} onChange={(e) => setV((p) => ({ ...p, deliveryTerms: e.target.value }))} maxLength={500} placeholder="Ex-mandi / delivered Lahore / 3 days" />
        </Field>
      </div>
      <Field label={t("common.notes")} htmlFor="qn" hint={t("common.optional")}>
        <Textarea id="qn" value={v.notes} onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))} maxLength={2000} rows={3} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
        <Button type="submit" size="lg" loading={pending}>
          {active ? t("enq.updateOffer") : t("action.respond")}
        </Button>
        {active ? (
          <ConfirmButton
            title={t("enq.withdraw")}
            confirmLabel={t("enq.withdraw")}
            cancelLabel={t("action.cancel")}
            onConfirm={async () => {
              const res = await withdrawQuoteAction(rfqId);
              if (res.ok) {
                toast.push(t("enq.withdrawn"), "success");
                router.refresh();
              } else toast.push(t("common.error"), "error");
            }}
          >
            {t("enq.withdraw")}
          </ConfirmButton>
        ) : (
          <ConfirmButton
            title={t("enq.declineConfirm")}
            confirmLabel={t("action.decline")}
            cancelLabel={t("action.cancel")}
            onConfirm={async () => {
              const res = await declineRfqAction(rfqId);
              if (res.ok) {
                toast.push(t("enq.declined"), "success");
                router.push("/dashboard/seller/enquiries");
                router.refresh();
              } else toast.push(t("common.error"), "error");
            }}
          >
            {t("action.decline")}
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
