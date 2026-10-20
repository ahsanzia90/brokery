"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { createRfqAction } from "@/lib/rfq/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, RadioCard, Select, Textarea, inputClass } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Search, X } from "lucide-react";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { FormSection, StickyActions } from "@/components/flows/form-section";

type CommodityLite = { id: string; slug: string; nameEn: string; nameUr: string | null; categoryName?: string; categoryNameUr?: string | null };
type FormMeta = {
  commodity: CommodityLite & { supportsVarieties: boolean; supportsGrades: boolean };
  varieties: Array<{ id: string; slug: string; nameEn: string; nameUr: string | null }>;
  grades: Array<{ id: string; slug: string; nameEn: string; nameUr: string | null; varietyId: string | null }>;
  units: Array<{ id: string; code: string; nameEn: string; nameUr: string | null; symbol: string; unitType: string }>;
  defaultUnitId: string | null;
  attributes: Array<{ id: string; key: string; nameEn: string; nameUr: string | null; type: string; unitLabel: string | null; allowedValues: string[] | null; helpText: string | null }>;
};
export type CityOption = { id: string; name: string; provinceId: string | null; provinceName: string; isMajor: boolean };

export type RfqPrefill = {
  commodity?: CommodityLite;
  varietyId?: string | null;
  gradeId?: string | null;
  cityId?: string | null;
  provinceId?: string | null;
  listingSlug?: string;
  supplier?: { id: string; slug: string; name: string };
};

type Draft = {
  commodity: CommodityLite | null;
  varietyId: string;
  gradeId: string;
  customSpecification: string;
  quantity: string;
  unitId: string;
  cityId: string;
  requiredBy: string;
  targetPrice: string;
  targetPriceUnitId: string;
  qualityRequirements: string;
  notes: string;
  contactPreference: "platform" | "phone" | "whatsapp" | "any";
  attributes: Record<string, string>;
  listingSlug: string;
  supplier: { id: string; slug: string; name: string } | null;
};

const DRAFT_KEY = "ml_rfq_draft";
const PREF_KEY = "ml_rfq_contact_pref";

function emptyDraft(prefill: RfqPrefill): Draft {
  let pref: Draft["contactPreference"] = "any";
  try {
    const p = localStorage.getItem(PREF_KEY);
    if (p === "platform" || p === "phone" || p === "whatsapp" || p === "any") pref = p;
  } catch {}
  return {
    commodity: prefill.commodity ?? null,
    varietyId: prefill.varietyId ?? "",
    gradeId: prefill.gradeId ?? "",
    customSpecification: "",
    quantity: "",
    unitId: "",
    cityId: prefill.cityId ?? "",
    requiredBy: "",
    targetPrice: "",
    targetPriceUnitId: "",
    qualityRequirements: "",
    notes: "",
    contactPreference: pref,
    attributes: {},
    listingSlug: prefill.listingSlug ?? "",
    supplier: prefill.supplier ?? null,
  };
}

export function RfqForm({ prefill, cities, isAuthenticated, initialQuery, restore }: { prefill: RfqPrefill; cities: CityOption[]; isAuthenticated: boolean; initialQuery?: string; restore?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const name = (r: { nameEn: string; nameUr?: string | null } | null | undefined) => (r ? (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn) : "");

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(prefill));
  const [restored, setRestored] = useState(false);
  const [meta, setMeta] = useState<FormMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<CommodityLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Restore draft (after sign-in redirect, or any time a draft exists and no explicit prefill)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && (restore || !prefill.commodity)) {
        const d = JSON.parse(raw) as Draft;
        if (d && d.commodity) {
          setDraft(d);
          setRestored(true);
        }
      }
    } catch {}
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (draft.commodity) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  // Load meta when commodity chosen
  useEffect(() => {
    if (!draft.commodity) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    setMetaLoading(true);
    fetch(`/api/rfq/commodity-form?commodity=${encodeURIComponent(draft.commodity.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: FormMeta | null) => {
        if (cancelled || !m) return;
        setMeta(m);
        setDraft((d) => ({ ...d, unitId: d.unitId && m.units.some((u) => u.id === d.unitId) ? d.unitId : (m.defaultUnitId ?? m.units[0]?.id ?? "") }));
      })
      .finally(() => !cancelled && setMetaLoading(false));
    return () => {
      cancelled = true;
    };
  }, [draft.commodity]);

  // Commodity search
  useEffect(() => {
    if (draft.commodity) return;
    const ctrl = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/rfq/commodity-search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: CommodityLite[] }) => setResults(d.items))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, query.trim() ? 150 : 0);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, draft.commodity]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v })), []);

  const gradesForVariety = useMemo(() => (meta ? meta.grades.filter((g) => !g.varietyId || g.varietyId === draft.varietyId) : []), [meta, draft.varietyId]);

  const majorCities = cities.filter((c) => c.isMajor);
  const otherCities = cities.filter((c) => !c.isMajor);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!draft.commodity) e.commodity = t("rfq.form.commodityRequired");
    const qty = Number(String(draft.quantity).replace(/,/g, ""));
    if (!draft.quantity || !Number.isFinite(qty) || qty <= 0) e.quantity = t("form.required");
    if (!draft.unitId) e.unitId = t("form.required");
    if (draft.targetPrice && !draft.targetPriceUnitId) e.targetPriceUnitId = t("form.required");
    if (draft.targetPrice && !(Number(draft.targetPrice.replace(/,/g, "")) > 0)) e.targetPrice = t("form.invalid");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: "center" });
      return;
    }
    try {
      localStorage.setItem(PREF_KEY, draft.contactPreference);
    } catch {}
    if (!isAuthenticated) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
      router.push(`/login?next=${encodeURIComponent("/rfq/new?restore=1")}`);
      return;
    }
    setSubmitting(true);
    const res = await createRfqAction({
      commodityId: draft.commodity!.id,
      varietyId: draft.varietyId || null,
      gradeId: draft.gradeId || null,
      customSpecification: draft.customSpecification || null,
      quantity: draft.quantity,
      unitId: draft.unitId,
      cityId: draft.cityId || null,
      provinceId: cities.find((c) => c.id === draft.cityId)?.provinceId ?? null,
      requiredBy: draft.requiredBy || null,
      targetPrice: draft.targetPrice || null,
      targetPriceUnitId: draft.targetPriceUnitId || null,
      qualityRequirements: draft.qualityRequirements || null,
      notes: draft.notes || null,
      contactPreference: draft.contactPreference,
      listingSlug: draft.listingSlug || null,
      targetBusinessId: draft.supplier?.id ?? null,
      attributes: draft.attributes,
    });
    setSubmitting(false);
    if (res.ok && res.data) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/rfq/${res.data.id}?created=1`);
      return;
    }
    if (!res.ok) {
      if (res.error === "unauthenticated") {
        router.push(`/login?next=${encodeURIComponent("/rfq/new?restore=1")}`);
        return;
      }
      if (res.error === "rate_limited") setServerError(t("error.rateLimited"));
      else if (res.error === "validation") {
        const fe: Record<string, string> = {};
        for (const k of Object.keys(res.fieldErrors ?? {})) fe[k === "commodityId" ? "commodity" : k] = t("form.invalid");
        setErrors(fe);
        setServerError(t("form.fixErrors"));
      } else setServerError(t("common.error"));
    }
  }

  const contactHints: Record<Draft["contactPreference"], string> = {
    platform: t("rfq.contact.platformHint"),
    phone: t("rfq.contact.phoneHint"),
    whatsapp: t("rfq.contact.whatsappHint"),
    any: t("rfq.contact.anyHint"),
  };

  /* ---------- Stage 1: choose commodity ---------- */
  if (!draft.commodity) {
    return (
      <div>
        <h2 className="text-[20px] font-extrabold leading-tight text-ink">{t("rfq.form.commodity")}</h2>
        <label htmlFor="rfq-commodity-search" className="sr-only">
          {t("rfq.form.searchCommodity")}
        </label>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input id="rfq-commodity-search" type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("rfq.form.searchCommodity")} className={`${inputClass} h-14 ps-12 text-[17px] shadow-[var(--shadow-sm)]`} aria-invalid={errors.commodity ? true : undefined} />
        </div>
        {errors.commodity && <p className="mt-1 text-[13px] font-medium text-danger">{errors.commodity}</p>}
        <ul className="mt-3 divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface" aria-busy={searching}>
          {results.map((c) => {
            const k = artKeyFor(c.slug, c.nameEn);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => { set("commodity", c); setErrors({}); }} className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-start hover:bg-surface-2">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] ${artTint[k]}`}>
                    <CommodityArt artKey={k} className="h-8 w-8" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{name(c)}</span>
                    <span className="block truncate text-[12px] text-muted">{locale === "ur" && c.categoryNameUr ? c.categoryNameUr : c.categoryName}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {!searching && query.trim() && results.length === 0 && <li className="px-3 py-3 text-[14px] text-muted">{t("form.noMatches")}</li>}
          {searching && results.length === 0 && <li className="px-3 py-3 text-[14px] text-muted">{t("common.loading")}</li>}
        </ul>
        <p className="mt-4 text-[13px] text-muted">{t("rfq.form.noCommodity")}</p>
      </div>
    );
  }

  /* ---------- Stage 2: the request ---------- */
  const ck = artKeyFor(draft.commodity.slug, draft.commodity.nameEn);
  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-3">
        {restored && <Alert tone="info">{t("rfq.form.draftRestored")}</Alert>}
        {!isAuthenticated && <Alert tone="info">{t("rfq.form.loginNote")}</Alert>}
        {draft.supplier && <Alert tone="success">{t("rfq.form.directTo", { name: draft.supplier.name })}</Alert>}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[var(--r-md)] border border-brand-800 bg-brand-50 p-3 ring-1 ring-brand-800">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${artTint[ck]}`}>
          <CommodityArt artKey={ck} className="h-10 w-10" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">{t("common.commodity")}</p>
          <p className="truncate text-[18px] font-bold text-ink">{name(draft.commodity)}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => { setDraft((d) => ({ ...emptyDraft({}), contactPreference: d.contactPreference })); setMeta(null); setQuery(""); }}>
          <X className="h-4 w-4" aria-hidden /> {t("rfq.form.change")}
        </Button>
      </div>
      {metaLoading && <p className="mt-3 flex items-center gap-2 text-[13px] text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> {t("common.loading")}</p>}

      {meta && ((meta.commodity.supportsVarieties && meta.varieties.length > 0) || (meta.commodity.supportsGrades && gradesForVariety.length > 0) || true) && (
        <FormSection title={t("rfq.form.what")}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {meta.commodity.supportsVarieties && meta.varieties.length > 0 && (
              <Field label={t("common.variety")} htmlFor="varietyId">
                <Select id="varietyId" value={draft.varietyId} onChange={(e) => { set("varietyId", e.target.value); set("gradeId", ""); }}>
                  <option value="">{t("common.any")}</option>
                  {meta.varieties.map((v) => (
                    <option key={v.id} value={v.id}>{name(v)}</option>
                  ))}
                </Select>
              </Field>
            )}
            {meta.commodity.supportsGrades && gradesForVariety.length > 0 && (
              <Field label={t("common.grade")} htmlFor="gradeId">
                <Select id="gradeId" value={draft.gradeId} onChange={(e) => set("gradeId", e.target.value)}>
                  <option value="">{t("common.any")}</option>
                  {gradesForVariety.map((g) => (
                    <option key={g.id} value={g.id}>{name(g)}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Field label={t("rfq.form.customSpec")} htmlFor="customSpecification">
            <Input id="customSpecification" value={draft.customSpecification} maxLength={300} onChange={(e) => set("customSpecification", e.target.value)} placeholder={t("listing.custom.grade")} />
          </Field>
        </FormSection>
      )}

      <FormSection title={t("rfq.form.quantity")}>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t("common.quantity")} required htmlFor="quantity" error={errors.quantity}>
            <Input id="quantity" inputMode="decimal" type="number" min="0" step="any" value={draft.quantity} onChange={(e) => set("quantity", e.target.value)} aria-invalid={errors.quantity ? true : undefined} className="h-12 text-[18px] font-bold font-latin" required />
          </Field>
          <Field label={t("common.unit")} required htmlFor="unitId" error={errors.unitId}>
            <Select id="unitId" value={draft.unitId} onChange={(e) => set("unitId", e.target.value)} aria-invalid={errors.unitId ? true : undefined} className="h-12 min-w-[150px]">
              {!meta && <option value="">…</option>}
              {meta?.units.map((u) => (
                <option key={u.id} value={u.id}>{name(u)} ({u.symbol})</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={`${t("rfq.requiredBy")} (${t("common.optional")})`} htmlFor="requiredBy" className="max-w-xs">
          <Input id="requiredBy" type="date" value={draft.requiredBy} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("requiredBy", e.target.value)} className="font-latin" />
        </Field>
      </FormSection>

      <FormSection title={t("rfq.form.where")}>
        <Field label={t("common.city")} htmlFor="cityId" className="max-w-md">
          <Select id="cityId" value={draft.cityId} onChange={(e) => set("cityId", e.target.value)}>
            <option value="">{t("common.any")}</option>
            <optgroup label="—">
              {majorCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="…">
              {otherCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.provinceName}</option>
              ))}
            </optgroup>
          </Select>
        </Field>
      </FormSection>

      <FormSection title={t("rfq.form.details")}>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={`${t("rfq.targetPrice")} (${t("common.optional")})`} htmlFor="targetPrice" error={errors.targetPrice}>
            <div className="flex items-stretch" dir="ltr">
              <span className="inline-flex items-center rounded-s-[var(--r-sm)] border border-e-0 border-line-strong bg-surface-2 px-3 text-[14px] font-semibold text-ink-2 font-latin">Rs.</span>
              <Input id="targetPrice" inputMode="decimal" type="number" min="0" step="any" value={draft.targetPrice} onChange={(e) => set("targetPrice", e.target.value)} aria-invalid={errors.targetPrice ? true : undefined} className="rounded-s-none font-latin" />
            </div>
          </Field>
          <Field label={t("unit.per")} htmlFor="targetPriceUnitId" error={errors.targetPriceUnitId}>
            <Select id="targetPriceUnitId" value={draft.targetPriceUnitId} onChange={(e) => set("targetPriceUnitId", e.target.value)} aria-invalid={errors.targetPriceUnitId ? true : undefined} className="min-w-[140px]">
              <option value="">{t("form.selectOne")}</option>
              {meta?.units.map((u) => (
                <option key={u.id} value={u.id}>{u.symbol}</option>
              ))}
            </Select>
          </Field>
        </div>
        {meta && meta.attributes.length > 0 && (
          <div className="mb-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
            {meta.attributes.slice(0, 8).map((a) => (
              <div key={a.id}>
                <label htmlFor={`attr-${a.id}`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                  {name(a)} {a.unitLabel ? <span className="font-normal text-muted">({a.unitLabel})</span> : null}
                </label>
                {a.type === "select" && a.allowedValues?.length ? (
                  <Select id={`attr-${a.id}`} value={draft.attributes[a.id] ?? ""} onChange={(e) => set("attributes", { ...draft.attributes, [a.id]: e.target.value })}>
                    <option value="">{t("common.any")}</option>
                    {a.allowedValues.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </Select>
                ) : (
                  <Input id={`attr-${a.id}`} type={a.type === "number" ? "number" : "text"} inputMode={a.type === "number" ? "decimal" : undefined} value={draft.attributes[a.id] ?? ""} onChange={(e) => set("attributes", { ...draft.attributes, [a.id]: e.target.value })} className={a.type === "number" ? "font-latin" : ""} />
                )}
              </div>
            ))}
          </div>
        )}
        <Field label={`${t("rfq.quality")} (${t("common.optional")})`} htmlFor="qualityRequirements">
          <Textarea id="qualityRequirements" rows={2} maxLength={1000} value={draft.qualityRequirements} onChange={(e) => set("qualityRequirements", e.target.value)} className="min-h-[80px]" />
        </Field>
        <Field label={`${t("common.notes")} (${t("common.optional")})`} htmlFor="notes">
          <Textarea id="notes" rows={3} maxLength={2000} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-[100px]" />
        </Field>
      </FormSection>

      <FormSection title={t("rfq.contactPref")}>
        <fieldset>
          <legend className="sr-only">{t("rfq.contactPref")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["any", "phone", "whatsapp", "platform"] as const).map((p) => (
              <RadioCard key={p} name="contactPreference" value={p} checked={draft.contactPreference === p} onChange={() => set("contactPreference", p)} label={t(`rfq.contact.${p}`)} description={contactHints[p]} />
            ))}
          </div>
        </fieldset>
      </FormSection>

      <div className="mt-8 rounded-[var(--r-lg)] bg-tint-sand p-5">
        <p className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{t("rfq.form.whatNext")}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{t("rfq.afterSubmit")}</p>
      </div>
      {serverError && <Alert tone="danger" className="mt-4">{serverError}</Alert>}
      <StickyActions>
        {!isAuthenticated && (
          <Link href={`/login?next=${encodeURIComponent("/rfq/new?restore=1")}`} className="me-auto text-[13px] font-semibold text-brand-800 underline underline-offset-4">
            {t("nav.login")}
          </Link>
        )}
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-[260px]" loading={submitting || metaLoading}>
          {isAuthenticated ? t("rfq.form.submit") : t("action.continue")}
        </Button>
      </StickyActions>
    </form>
  );
}
