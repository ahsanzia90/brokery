"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { createOrUpdateBusinessAction } from "@/lib/business/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { CommodityChecklist, type CommodityOption } from "./commodity-picker";
import { ImageUploader, type UploadedImage } from "./uploaders";
import { formatPhoneLocal } from "@/lib/utils/phone";

export type LocationOption = { id: string; nameEn: string; nameUr: string | null; parentId: string | null; type: string; isMajorMarket?: boolean };

export type BusinessFormValues = {
  name: string;
  businessType: string;
  description: string;
  contactPersonName: string;
  addressLine: string;
  provinceId: string;
  cityId: string;
  marketId: string;
  publicPhone: string;
  whatsappNumber: string;
  showPhonePublicly: boolean;
  showWhatsappPublicly: boolean;
  showAddressPublicly: boolean;
  website: string;
  yearsInBusiness: string;
  languages: string[];
  registrationNumber: string;
  logoPath: string | null;
};

const BUSINESS_TYPES = ["trader", "wholesaler", "manufacturer", "farmer", "importer", "exporter", "distributor", "broker", "mill", "other"];
const LANGS = [
  { v: "ur", l: "اردو / Urdu" },
  { v: "en", l: "English" },
  { v: "pa", l: "پنجابی / Punjabi" },
  { v: "sd", l: "سنڌي / Sindhi" },
  { v: "ps", l: "پښتو / Pashto" },
  { v: "bal", l: "بلوچی / Balochi" },
];

export function BusinessForm({ initial, initialCommodities, provinces, userPhone, maxImageBytes, isNew, nextPath }: { initial: BusinessFormValues; initialCommodities: CommodityOption[]; provinces: LocationOption[]; userPhone: string; maxImageBytes: number; isNew: boolean; nextPath?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<BusinessFormValues>(initial);
  const [commodities, setCommodities] = useState<CommodityOption[]>(initialCommodities);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [markets, setMarkets] = useState<LocationOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const name = (l: LocationOption) => (locale === "ur" && l.nameUr ? l.nameUr : l.nameEn);

  useEffect(() => {
    if (!v.provinceId) {
      setCities([]);
      return;
    }
    fetch(`/api/taxonomy/locations?type=city&parent=${v.provinceId}`)
      .then((r) => r.json())
      .then((d: { items: LocationOption[] }) => setCities(d.items.sort((a, b) => Number(b.isMajorMarket ?? 0) - Number(a.isMajorMarket ?? 0))))
      .catch(() => {});
  }, [v.provinceId]);
  useEffect(() => {
    if (!v.cityId) {
      setMarkets([]);
      return;
    }
    fetch(`/api/taxonomy/locations?type=market&parent=${v.cityId}`)
      .then((r) => r.json())
      .then((d: { items: LocationOption[] }) => setMarkets(d.items))
      .catch(() => {});
  }, [v.cityId]);

  const set = <K extends keyof BusinessFormValues>(k: K, val: BusinessFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => (errors[k] ? (errors[k] === "invalid_phone" ? t("auth.invalidPhone") : errors[k] === "min" || errors[k] === "max" ? t("form.invalid") : t("form.invalid")) : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    start(async () => {
      const res = await createOrUpdateBusinessAction({
        name: v.name,
        businessType: v.businessType as "trader",
        description: v.description,
        contactPersonName: v.contactPersonName,
        addressLine: v.addressLine,
        provinceId: v.provinceId || null,
        cityId: v.cityId || null,
        marketId: v.marketId || null,
        publicPhone: v.publicPhone || userPhone,
        whatsappNumber: v.whatsappNumber,
        showPhonePublicly: v.showPhonePublicly,
        showWhatsappPublicly: v.showWhatsappPublicly,
        showAddressPublicly: v.showAddressPublicly,
        website: v.website,
        yearsInBusiness: v.yearsInBusiness,
        languages: v.languages,
        commodityIds: commodities.map((c) => c.id),
        logoPath: v.logoPath,
        registrationNumber: v.registrationNumber,
      });
      if (res.ok) {
        toast.push(t("biz.saved"), "success");
        setErrors({});
        router.push(nextPath ?? "/dashboard/seller");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        setGeneralError(res.error === "validation" ? t("form.fixErrors") : t("common.error"));
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl">
      {generalError && <Alert tone="danger" className="mb-4">{generalError}</Alert>}
      <Field label={t("biz.name")} required htmlFor="bname" error={err("name")}>
        <Input id="bname" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required aria-invalid={Boolean(errors.name) || undefined} />
      </Field>
      <Field label={t("biz.type")} htmlFor="btype">
        <Select id="btype" value={v.businessType} onChange={(e) => set("businessType", e.target.value)}>
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {t(`biz.type.${bt}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("biz.description")} htmlFor="bdesc" hint={t("common.optional")}>
        <Textarea id="bdesc" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} rows={4} />
      </Field>

      <fieldset className="mb-5">
        <legend className="mb-2 text-base font-semibold">{t("biz.commodities")}</legend>
        <p className="mb-2 text-sm text-text-muted">{t("biz.commoditiesHint")}</p>
        <CommodityChecklist selected={commodities} onChange={setCommodities} />
      </fieldset>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("common.province")} htmlFor="prov">
          <Select id="prov" value={v.provinceId} onChange={(e) => { set("provinceId", e.target.value); set("cityId", ""); set("marketId", ""); }}>
            <option value="">{t("form.selectOne")}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{name(p)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.city")} htmlFor="city">
          <Select id="city" value={v.cityId} onChange={(e) => { set("cityId", e.target.value); set("marketId", ""); }} disabled={!v.provinceId}>
            <option value="">{t("form.selectOne")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{name(c)}</option>
            ))}
          </Select>
        </Field>
      </div>
      {markets.length > 0 && (
        <Field label={t("common.market")} htmlFor="market" hint={t("common.optional")}>
          <Select id="market" value={v.marketId} onChange={(e) => set("marketId", e.target.value)}>
            <option value="">{t("common.none")}</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{name(m)}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={t("biz.address")} htmlFor="addr" hint={t("common.optional")}>
        <Input id="addr" value={v.addressLine} onChange={(e) => set("addressLine", e.target.value)} maxLength={300} />
      </Field>
      <Field label={t("biz.contactPerson")} htmlFor="cp" hint={t("common.optional")}>
        <Input id="cp" value={v.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} maxLength={100} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("biz.publicPhone")} htmlFor="pphone" error={err("publicPhone")} hint={formatPhoneLocal(userPhone)}>
          <Input id="pphone" type="tel" inputMode="tel" dir="ltr" className="font-latin" value={v.publicPhone} onChange={(e) => set("publicPhone", e.target.value)} placeholder={formatPhoneLocal(userPhone)} />
        </Field>
        <Field label={t("biz.whatsapp")} htmlFor="wa" error={err("whatsappNumber")} hint={t("common.optional")}>
          <Input id="wa" type="tel" inputMode="tel" dir="ltr" className="font-latin" value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} placeholder="0300 1234567" />
        </Field>
      </div>
      <div className="card mb-5 p-4">
        <Checkbox label={t("biz.showPhone")} checked={v.showPhonePublicly} onChange={(e) => set("showPhonePublicly", e.target.checked)} />
        <Checkbox label={t("biz.showWhatsapp")} checked={v.showWhatsappPublicly} onChange={(e) => set("showWhatsappPublicly", e.target.checked)} disabled={!v.whatsappNumber} />
        <Checkbox label={t("biz.showAddress")} checked={v.showAddressPublicly} onChange={(e) => set("showAddressPublicly", e.target.checked)} />
        <p className="mt-2 text-sm text-text-muted">{t("biz.privacyNote")}</p>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("biz.website")} htmlFor="web" hint={t("common.optional")}>
          <Input id="web" type="url" dir="ltr" className="font-latin" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="www.example.com" />
        </Field>
        <Field label={t("biz.years")} htmlFor="years" hint={t("common.optional")} error={err("yearsInBusiness")}>
          <Input id="years" type="number" inputMode="numeric" min={0} max={150} className="font-latin" value={v.yearsInBusiness} onChange={(e) => set("yearsInBusiness", e.target.value)} />
        </Field>
      </div>
      <fieldset className="mb-5">
        <legend className="mb-2 text-base font-semibold">{t("biz.languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <label key={l.v} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={v.languages.includes(l.v)} onChange={(e) => set("languages", e.target.checked ? [...v.languages, l.v] : v.languages.filter((x) => x !== l.v))} />
              {l.l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("biz.registration")} htmlFor="reg" hint={t("common.optional")}>
        <Input id="reg" dir="ltr" className="font-latin" value={v.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} maxLength={60} />
      </Field>
      <fieldset className="mb-6">
        <legend className="mb-2 text-base font-semibold">{t("biz.logo")}</legend>
        <ImageUploader kind="logo" max={1} maxBytes={maxImageBytes} images={v.logoPath ? [{ path: v.logoPath }] : []} onChange={(imgs: UploadedImage[]) => set("logoPath", imgs[0]?.path ?? null)} />
      </fieldset>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
        {isNew ? t("action.continue") : t("action.save")}
      </Button>
    </form>
  );
}
