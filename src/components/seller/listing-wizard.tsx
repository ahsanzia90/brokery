"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { createListingAction, updateListingAction } from "@/lib/listings/actions";
import type { ListingPayload } from "@/lib/listings/schema";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCard, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Facts } from "@/components/flows/form-section";
import { formatNumber, formatPKR } from "@/lib/utils/format";
import { formatPhoneLocal } from "@/lib/utils/phone";
import { CommodityPicker, commodityLabel, type CommodityOption } from "./commodity-picker";
import { ImageUploader, ListingDocumentUploader, type UploadedDoc, type UploadedImage } from "./uploaders";

type Named = { id: string; nameEn: string; nameUr: string | null };
export type CategoryOption = Named & { parentId: string | null; icon?: string | null };
type FormData = {
  commodity: { id: string; slug: string; nameEn: string; nameUr: string | null; supportsVarieties: boolean; supportsGrades: boolean };
  varieties: Array<Named & { slug: string }>;
  grades: Array<Named & { varietyId: string | null; description: string | null }>;
  units: Array<Named & { code: string; symbol: string; unitType: string; conversionNote: string | null }>;
  defaultUnitId: string | null;
  attributes: Array<Named & { key: string; type: string; unitLabel: string | null; allowedValues: string[] | null; isRequired: boolean; helpText: string | null }>;
  moderationLevel: "auto" | "review" | "restricted" | "prohibited";
  maundKg: number;
  maxImages: number;
};
type Loc = { id: string; nameEn: string; nameUr: string | null; parentId: string | null; isMajorMarket?: boolean };

export type WizardState = {
  categoryId: string;
  varietyId: string;
  customVariety: string;
  gradeId: string;
  customGrade: string;
  title: string;
  quantity: string;
  unitId: string;
  minOrderQuantity: string;
  minOrderUnitId: string;
  priceType: "fixed" | "negotiable" | "quote" | "on_contact";
  priceAmount: string;
  priceUnitId: string;
  provinceId: string;
  cityId: string;
  marketId: string;
  pickupLocation: string;
  deliveryAvailable: "yes" | "no" | "ask";
  condition: "new" | "used" | "refurbished" | "fresh" | "stored" | "not_applicable";
  packaging: string;
  availableFrom: string;
  description: string;
  images: UploadedImage[];
  documents: UploadedDoc[];
  attributes: Record<string, string>;
  contactPhoneEnabled: boolean;
  contactWhatsappEnabled: boolean;
};

const EMPTY: WizardState = {
  categoryId: "",
  varietyId: "",
  customVariety: "",
  gradeId: "",
  customGrade: "",
  title: "",
  quantity: "",
  unitId: "",
  minOrderQuantity: "",
  minOrderUnitId: "",
  priceType: "negotiable",
  priceAmount: "",
  priceUnitId: "",
  provinceId: "",
  cityId: "",
  marketId: "",
  pickupLocation: "",
  deliveryAvailable: "ask",
  condition: "not_applicable",
  packaging: "",
  availableFrom: "",
  description: "",
  images: [],
  documents: [],
  attributes: {},
  contactPhoneEnabled: true,
  contactWhatsappEnabled: true,
};

const DRAFT_KEY = "ml_listing_draft_v1";
const TOTAL = 6;
const NOT_LISTED = "__custom__";

export function ListingWizard({
  mode,
  listingId,
  initial,
  initialCommodity,
  categories,
  provinces,
  business,
  maxImageBytes,
  maxDocBytes,
  editNote,
}: {
  mode: "create" | "edit";
  listingId?: string;
  initial?: Partial<WizardState>;
  initialCommodity?: CommodityOption | null;
  categories: CategoryOption[];
  provinces: Loc[];
  business: { phone: string | null; whatsapp: string | null };
  maxImageBytes: number;
  maxDocBytes: number;
  editNote?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [s, setS] = useState<WizardState>({ ...EMPTY, ...initial });
  const [commodity, setCommodity] = useState<CommodityOption | null>(initialCommodity ?? null);
  const [form, setForm] = useState<FormData | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [cities, setCities] = useState<Loc[]>([]);
  const [markets, setMarkets] = useState<Loc[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [pending, start] = useTransition();
  const hydrated = useRef(false);
  const name = (r: Named) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setS((p) => ({ ...p, [k]: v }));

  /* Restore local draft (create mode only) */
  useEffect(() => {
    if (mode !== "create" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { state: WizardState; commodity: CommodityOption | null; step: number };
        if (d.state && (!initialCommodity || d.commodity?.id === initialCommodity.id)) {
          setS({ ...EMPTY, ...d.state });
          if (d.commodity) setCommodity(d.commodity);
          setStep(Math.min(Math.max(d.step || 1, 1), TOTAL));
          setRestored(true);
        }
      }
    } catch {}
  }, [mode, initialCommodity]);
  useEffect(() => {
    if (mode !== "create" || !hydrated.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: s, commodity, step }));
    } catch {}
  }, [s, commodity, step, mode]);

  /* Load form data for commodity */
  useEffect(() => {
    if (!commodity) {
      setForm(null);
      return;
    }
    let cancelled = false;
    setFormLoading(true);
    fetch(`/api/taxonomy/commodity-form?commodity=${commodity.id}`)
      .then((r) => r.json())
      .then((d: FormData) => {
        if (cancelled || !d.commodity) return;
        setForm(d);
        setS((p) => ({
          ...p,
          unitId: p.unitId && d.units.some((u) => u.id === p.unitId) ? p.unitId : d.defaultUnitId ?? d.units[0]?.id ?? "",
          priceUnitId: p.priceUnitId && d.units.some((u) => u.id === p.priceUnitId) ? p.priceUnitId : p.priceUnitId || d.defaultUnitId || "",
        }));
      })
      .catch(() => setGeneral(t("common.error")))
      .finally(() => !cancelled && setFormLoading(false));
    return () => {
      cancelled = true;
    };
  }, [commodity, t]);

  /* Locations */
  useEffect(() => {
    if (!s.provinceId) {
      setCities([]);
      return;
    }
    fetch(`/api/taxonomy/locations?type=city&parent=${s.provinceId}`)
      .then((r) => r.json())
      .then((d: { items: Loc[] }) => setCities([...d.items].sort((a, b) => Number(b.isMajorMarket) - Number(a.isMajorMarket) || a.nameEn.localeCompare(b.nameEn))))
      .catch(() => {});
  }, [s.provinceId]);
  useEffect(() => {
    if (!s.cityId) {
      setMarkets([]);
      return;
    }
    fetch(`/api/taxonomy/locations?type=market&parent=${s.cityId}`)
      .then((r) => r.json())
      .then((d: { items: Loc[] }) => setMarkets(d.items))
      .catch(() => {});
  }, [s.cityId]);

  const unitSymbol = (id: string) => form?.units.find((u) => u.id === id)?.symbol ?? "";
  const varietyName = s.varietyId ? form?.varieties.find((v) => v.id === s.varietyId) : null;
  const gradeName = s.gradeId ? form?.grades.find((g) => g.id === s.gradeId) : null;
  const visibleGrades = useMemo(() => (form?.grades ?? []).filter((g) => !g.varietyId || g.varietyId === s.varietyId), [form, s.varietyId]);
  const suggestedTitle = useMemo(() => {
    if (!commodity) return "";
    const parts = [commodityLabel(commodity, locale), varietyName ? name(varietyName) : s.customVariety, gradeName ? name(gradeName) : s.customGrade, cities.find((c) => c.id === s.cityId)?.nameEn].filter(Boolean);
    return parts.join(" · ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodity, varietyName, gradeName, s.customVariety, s.customGrade, s.cityId, cities, locale]);
  const restricted = form?.moderationLevel === "restricted";
  const prohibited = form?.moderationLevel === "prohibited";

  const stepOfField = (f: string): number => {
    if (/^(commodityId|varietyId|gradeId|title|customVariety|customGrade)$/.test(f)) return 1;
    if (/^(quantity|unitId|minOrder)/.test(f)) return 2;
    if (/^price/.test(f)) return 3;
    if (/^(provinceId|districtId|cityId|marketId|pickupLocation|deliveryAvailable)$/.test(f)) return 4;
    return 5;
  };

  const validateStep = useCallback(
    (n: number, forSubmit: boolean): Record<string, string> => {
      const e: Record<string, string> = {};
      if (n === 1) {
        if (!commodity) e.commodityId = t("wizard.selectCommodityFirst");
        if (prohibited) e.commodityId = t("wizard.prohibited");
        if (!s.title.trim() || s.title.trim().length < 3) e.title = t("form.required");
      }
      if (n === 2) {
        if (!(Number(s.quantity) > 0)) e.quantity = t("form.required");
        if (!s.unitId) e.unitId = t("form.required");
        if (s.minOrderQuantity && !s.minOrderUnitId) e.minOrderUnitId = t("form.required");
      }
      if (n === 3 && (s.priceType === "fixed" || s.priceType === "negotiable")) {
        if (!(Number(s.priceAmount) > 0)) e.priceAmount = t("form.required");
        if (!s.priceUnitId) e.priceUnitId = t("form.required");
      }
      if (n === 4 && forSubmit && !s.cityId) e.cityId = t("form.required");
      if (n === 5) {
        if (forSubmit && restricted && s.documents.length === 0) e.documents = t("wizard.documentsRequired");
        if (forSubmit) for (const a of form?.attributes ?? []) if (a.isRequired && !(s.attributes[a.id] ?? "").trim()) e[`attributes.${a.id}`] = t("form.required");
      }
      return e;
    },
    [commodity, prohibited, restricted, s, form, t],
  );

  function next() {
    const e = validateStep(step, false);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((x) => Math.min(x + 1, TOTAL));
    window.scrollTo({ top: 0 });
  }

  function payload(submit: boolean): ListingPayload {
    return {
      commodityId: commodity?.id ?? "",
      varietyId: s.varietyId || null,
      customVariety: s.varietyId ? null : s.customVariety || null,
      gradeId: s.gradeId || null,
      customGrade: s.gradeId ? null : s.customGrade || null,
      title: s.title.trim() || suggestedTitle,
      quantity: s.quantity,
      unitId: s.unitId,
      minOrderQuantity: s.minOrderQuantity || null,
      minOrderUnitId: s.minOrderUnitId || null,
      priceType: s.priceType,
      priceAmount: s.priceType === "fixed" || s.priceType === "negotiable" ? s.priceAmount || null : null,
      priceUnitId: s.priceType === "fixed" || s.priceType === "negotiable" ? s.priceUnitId || null : null,
      provinceId: s.provinceId || null,
      districtId: cities.find((c) => c.id === s.cityId)?.parentId ?? null,
      cityId: s.cityId || null,
      marketId: s.marketId || null,
      pickupLocation: s.pickupLocation || null,
      deliveryAvailable: s.deliveryAvailable,
      condition: s.condition,
      packaging: s.packaging || null,
      availableFrom: s.availableFrom || null,
      description: s.description || null,
      images: s.images.map((i) => ({ path: i.path, altText: i.altText ?? null })),
      documents: s.documents.map((d) => ({ path: d.path, label: d.label, mimeType: d.mimeType, sizeBytes: d.sizeBytes, isPublic: d.isPublic })),
      attributes: Object.fromEntries(Object.entries(s.attributes).filter(([, v]) => v.trim())),
      contactPhoneEnabled: s.contactPhoneEnabled,
      contactWhatsappEnabled: s.contactWhatsappEnabled,
      submit,
    };
  }

  function send(submit: boolean) {
    setGeneral(null);
    let all: Record<string, string> = {};
    for (let n = 1; n <= 5; n++) all = { ...all, ...validateStep(n, submit) };
    if (!submit) {
      // Draft: only the essentials.
      all = Object.fromEntries(Object.entries(all).filter(([k]) => ["commodityId", "title", "quantity", "unitId"].includes(k)));
    }
    setErrors(all);
    if (Object.keys(all).length) {
      setStep(stepOfField(Object.keys(all)[0]));
      setGeneral(t("form.fixErrors"));
      return;
    }
    start(async () => {
      const res = mode === "edit" && listingId ? await updateListingAction(listingId, payload(submit)) : await createListingAction(payload(submit));
      if (res.ok && res.data) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        router.push(`/dashboard/seller/listings/${res.data.listingId}?saved=1`);
        router.refresh();
        return;
      }
      if (!res.ok) {
        if (res.error === "no_business") {
          router.push(`/dashboard/seller/business?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        if (res.error === "prohibited") {
          setGeneral(t("wizard.prohibited"));
          setStep(1);
          return;
        }
        if (res.error === "rate_limited") {
          setGeneral(t("error.rateLimited"));
          return;
        }
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) fe[k] = v === "required" || v === "min" ? t("form.required") : v === "invalid_path" ? t("wizard.uploadFailed") : t("form.invalid");
        if (fe.documents) fe.documents = t("wizard.documentsRequired");
        setErrors(fe);
        const first = Object.keys(fe)[0];
        setStep(first ? stepOfField(first) : step);
        setGeneral(res.error === "validation" ? t("form.fixErrors") : t("common.error"));
      }
    });
  }

  const topCats = categories.filter((c) => !c.parentId);
  const stepTitles = [t("listing.create.step1"), t("listing.create.step2"), t("listing.create.step3"), t("listing.create.step4"), t("listing.create.step5"), t("listing.create.step6")];

  return (
    <div className="max-w-2xl">
      {/* stepper */}
      <ol className="hidden items-center gap-1 sm:flex" aria-label={t("wizard.stepOf", { n: step, total: TOTAL })}>
        {stepTitles.map((_, i) => {
          const n = i + 1;
          const title = t(`wizard.short.${n}`);
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={title} className="flex min-w-0 flex-1 items-center gap-1">
              <button type="button" disabled={n > step} onClick={() => setStep(n)} className={`flex min-w-0 items-center gap-2 rounded-full py-1 pe-2 text-start ${n > step ? "cursor-default" : "hover:bg-surface-2"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold num ${state === "done" ? "bg-brand-800 text-white" : state === "current" ? "bg-ink text-white" : "border border-line-strong text-muted"}`}>
                  {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
                </span>
                <span className={`truncate text-[12px] font-semibold ${state === "current" ? "text-ink" : "text-muted"}`}>{title}</span>
              </button>
              {n < TOTAL && <span className={`h-px flex-1 ${n < step ? "bg-brand-800" : "bg-line"}`} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <div className="sm:hidden">
        <p className="text-[12px] font-bold uppercase tracking-wide text-muted num">{t("wizard.stepOf", { n: step, total: TOTAL })}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-brand-800 transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>
      <h2 className="mt-5 text-[22px] font-extrabold leading-tight text-ink md:text-[26px]">{stepTitles[step - 1]}</h2>
      {restored && (
        <Alert tone="info" className="mt-3">
          {t("wizard.draftRestored")}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              try {
                localStorage.removeItem(DRAFT_KEY);
              } catch {}
              setS({ ...EMPTY, ...initial });
              setCommodity(initialCommodity ?? null);
              setStep(1);
              setRestored(false);
            }}
          >
            {t("wizard.discardDraft")}
          </button>
        </Alert>
      )}
      {editNote && mode === "edit" && <Alert tone="info" className="mt-3">{t("wizard.editNote")}</Alert>}
      {general && <Alert tone="danger" className="mt-3">{general}</Alert>}

      <div className="mt-5 border-t border-line pt-6">
        {/* ---------- Step 1 ---------- */}
        {step === 1 && (
          <div>
            {!commodity && (
              <Field label={t("wizard.category")} htmlFor="cat" hint={t("common.optional")}>
                <Select id="cat" value={s.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {topCats.map((c) => (
                    <optgroup key={c.id} label={name(c)}>
                      <option value={c.id}>{name(c)} — {t("common.all")}</option>
                      {categories
                        .filter((x) => x.parentId === c.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {name(x)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t("wizard.commodity")} required error={errors.commodityId}>
              <CommodityPicker
                value={commodity}
                categoryId={s.categoryId || null}
                autoFocus={!commodity}
                onChange={(c) => {
                  setCommodity(c);
                  setS((p) => ({ ...p, varietyId: "", customVariety: "", gradeId: "", customGrade: "", attributes: {}, title: "" }));
                }}
              />
            </Field>
            {formLoading && <p className="flex items-center gap-2 text-[14px] text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> {t("wizard.loading")}</p>}
            {form && prohibited && <Alert tone="danger">{t("wizard.prohibited")} <Link href="/prohibited-items" className="underline">{t("footer.prohibited")}</Link></Alert>}
            {form && restricted && <Alert tone="warning" className="mb-4">{t("wizard.restricted")}</Alert>}
            {form && !prohibited && (
              <>
                {form.commodity.supportsVarieties && (
                  <Field label={t("wizard.variety")} htmlFor="variety" error={errors.varietyId}>
                    <Select
                      id="variety"
                      value={s.varietyId || (s.customVariety ? NOT_LISTED : "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === NOT_LISTED) setS((p) => ({ ...p, varietyId: "", customVariety: p.customVariety || " " }));
                        else setS((p) => ({ ...p, varietyId: v, customVariety: "", gradeId: "" }));
                      }}
                    >
                      <option value="">{t("form.selectOne")}</option>
                      {form.varieties.map((v) => (
                        <option key={v.id} value={v.id}>
                          {name(v)}
                        </option>
                      ))}
                      <option value={NOT_LISTED}>{t("wizard.notListed")}</option>
                    </Select>
                    {!s.varietyId && s.customVariety !== "" && (
                      <div className="mt-2">
                        <Input value={s.customVariety.trim()} onChange={(e) => set("customVariety", e.target.value || " ")} placeholder={t("listing.custom.variety")} maxLength={100} aria-label={t("listing.custom.variety")} />
                        <p className="mt-1 text-[13px] text-muted">{t("wizard.customReview")}</p>
                      </div>
                    )}
                  </Field>
                )}
                {form.commodity.supportsGrades && (
                  <Field label={t("wizard.grade")} htmlFor="grade" error={errors.gradeId}>
                    <Select
                      id="grade"
                      value={s.gradeId || (s.customGrade ? NOT_LISTED : "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === NOT_LISTED) setS((p) => ({ ...p, gradeId: "", customGrade: p.customGrade || " " }));
                        else setS((p) => ({ ...p, gradeId: v, customGrade: "" }));
                      }}
                    >
                      <option value="">{t("form.selectOne")}</option>
                      {visibleGrades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {name(g)}
                        </option>
                      ))}
                      <option value={NOT_LISTED}>{t("wizard.notListed")}</option>
                    </Select>
                    {!s.gradeId && s.customGrade !== "" && (
                      <div className="mt-2">
                        <Input value={s.customGrade.trim()} onChange={(e) => set("customGrade", e.target.value || " ")} placeholder={t("listing.custom.grade")} maxLength={100} aria-label={t("listing.custom.grade")} />
                        <p className="mt-1 text-[13px] text-muted">{t("wizard.customReview")}</p>
                      </div>
                    )}
                  </Field>
                )}
                <Field label={t("wizard.title")} required htmlFor="title" error={errors.title} hint={t("wizard.titleHint")}>
                  <Input id="title" value={s.title} onChange={(e) => set("title", e.target.value)} placeholder={suggestedTitle} maxLength={120} aria-invalid={Boolean(errors.title) || undefined} />
                  {!s.title && suggestedTitle && (
                    <button type="button" className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-900 hover:bg-brand-100" onClick={() => set("title", suggestedTitle)}>
                      <span className="truncate">“{suggestedTitle}”</span>
                    </button>
                  )}
                </Field>
              </>
            )}
          </div>
        )}

        {/* ---------- Step 2 ---------- */}
        {step === 2 && form && (
          <div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label={t("wizard.quantity")} required htmlFor="qty" error={errors.quantity}>
                <Input id="qty" type="number" inputMode="decimal" min={0} step="any" className="font-latin text-lg" value={s.quantity} onChange={(e) => set("quantity", e.target.value)} aria-invalid={Boolean(errors.quantity) || undefined} />
              </Field>
              <Field label={t("wizard.unit")} required htmlFor="unit" error={errors.unitId}>
                <Select id="unit" value={s.unitId} onChange={(e) => setS((p) => ({ ...p, unitId: e.target.value, priceUnitId: p.priceUnitId || e.target.value }))}>
                  {form.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {name(u)} ({u.symbol})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {(s.quantity && s.unitId) || form.units.find((u) => u.id === s.unitId)?.code === "maund" ? (
              <div className="mb-5 rounded-[var(--r-md)] bg-tint-sand px-4 py-3 text-[14px]">
                {s.quantity && s.unitId && (
                  <p className="text-[18px] font-extrabold text-ink num">
                    {formatNumber(s.quantity)} {unitSymbol(s.unitId)}
                  </p>
                )}
                {form.units.find((u) => u.id === s.unitId)?.code === "maund" && <p className="text-[13px] text-ink-2">{t("unit.maundNote", { kg: form.maundKg })}</p>}
              </div>
            ) : null}
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label={t("wizard.minOrder")} htmlFor="moq">
                <Input id="moq" type="number" inputMode="decimal" min={0} step="any" className="font-latin" value={s.minOrderQuantity} onChange={(e) => setS((p) => ({ ...p, minOrderQuantity: e.target.value, minOrderUnitId: p.minOrderUnitId || p.unitId }))} />
              </Field>
              {s.minOrderQuantity && (
                <Field label={t("wizard.minOrderUnit")} htmlFor="moqUnit" error={errors.minOrderUnitId}>
                  <Select id="moqUnit" value={s.minOrderUnitId} onChange={(e) => set("minOrderUnitId", e.target.value)}>
                    {form.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {name(u)} ({u.symbol})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ---------- Step 3 ---------- */}
        {step === 3 && form && (
          <div>
            <fieldset className="mb-5">
              <legend className="mb-2 text-[14px] font-semibold text-ink">{t("wizard.priceType")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["fixed", "negotiable", "quote", "on_contact"] as const).map((pt) => (
                  <RadioCard key={pt} name="priceType" value={pt} checked={s.priceType === pt} onChange={() => set("priceType", pt)} label={t(`wizard.price.${pt}`)} description={t(`wizard.price.${pt}Sub`)} />
                ))}
              </div>
            </fieldset>
            {(s.priceType === "fixed" || s.priceType === "negotiable") && (
              <>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label={t("wizard.priceAmount")} required htmlFor="price" error={errors.priceAmount}>
                    <Input id="price" type="number" inputMode="decimal" min={0} step="any" className="font-latin text-lg" value={s.priceAmount} onChange={(e) => set("priceAmount", e.target.value)} aria-invalid={Boolean(errors.priceAmount) || undefined} />
                  </Field>
                  <Field label={t("wizard.priceUnit")} required htmlFor="priceUnit" error={errors.priceUnitId} hint={t("listing.priceHint")}>
                    <Select id="priceUnit" value={s.priceUnitId} onChange={(e) => set("priceUnitId", e.target.value)}>
                      <option value="">{t("form.selectOne")}</option>
                      {form.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {name(u)} ({u.symbol})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {Number(s.priceAmount) > 0 && s.priceUnitId && <Alert tone="success">{t("wizard.priceExample", { amount: formatNumber(s.priceAmount), unit: unitSymbol(s.priceUnitId) })}</Alert>}
              </>
            )}
          </div>
        )}

        {/* ---------- Step 4 ---------- */}
        {step === 4 && (
          <div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label={t("wizard.province")} required htmlFor="prov" error={errors.provinceId}>
                <Select id="prov" value={s.provinceId} onChange={(e) => setS((p) => ({ ...p, provinceId: e.target.value, cityId: "", marketId: "" }))}>
                  <option value="">{t("form.selectOne")}</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {name(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("wizard.city")} required htmlFor="city" error={errors.cityId}>
                <Select id="city" value={s.cityId} disabled={!s.provinceId} onChange={(e) => setS((p) => ({ ...p, cityId: e.target.value, marketId: "" }))} aria-invalid={Boolean(errors.cityId) || undefined}>
                  <option value="">{t("form.selectOne")}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {name(c)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {markets.length > 0 && (
              <Field label={t("wizard.market")} htmlFor="market">
                <Select id="market" value={s.marketId} onChange={(e) => set("marketId", e.target.value)}>
                  <option value="">{t("common.none")}</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {name(m)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t("wizard.pickup")} htmlFor="pickup">
              <Input id="pickup" value={s.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} maxLength={200} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[14px] font-semibold text-ink">{t("wizard.delivery")}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <RadioCard name="delivery" value="yes" checked={s.deliveryAvailable === "yes"} onChange={() => set("deliveryAvailable", "yes")} label={t("common.yes")} />
                <RadioCard name="delivery" value="no" checked={s.deliveryAvailable === "no"} onChange={() => set("deliveryAvailable", "no")} label={t("common.no")} />
                <RadioCard name="delivery" value="ask" checked={s.deliveryAvailable === "ask"} onChange={() => set("deliveryAvailable", "ask")} label={t("common.ask")} />
              </div>
            </fieldset>
          </div>
        )}

        {/* ---------- Step 5 ---------- */}
        {step === 5 && form && (
          <div>
            <fieldset className="mb-5">
              <legend className="mb-2 text-[14px] font-semibold text-ink">{t("wizard.photos")}</legend>
              <ImageUploader images={s.images} onChange={(imgs) => set("images", imgs)} max={form.maxImages} maxBytes={maxImageBytes} />
            </fieldset>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label={t("wizard.condition")} htmlFor="cond">
                <Select id="cond" value={s.condition} onChange={(e) => set("condition", e.target.value as WizardState["condition"])}>
                  {(["not_applicable", "new", "fresh", "stored", "used", "refurbished"] as const).map((c) => (
                    <option key={c} value={c}>
                      {t(`wizard.condition.${c}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("wizard.packaging")} htmlFor="pack" hint={t("common.optional")}>
                <Input id="pack" value={s.packaging} onChange={(e) => set("packaging", e.target.value)} maxLength={120} placeholder="50 kg PP bags / loose / drums" />
              </Field>
            </div>
            {form.attributes.length > 0 && (
              <fieldset className="mb-5 mt-2 border-t border-line pt-5">
                <legend className="mb-3 translate-y-[-1px] text-[14px] font-semibold text-ink">{t("wizard.specs")}</legend>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {form.attributes.map((a) => {
                    const val = s.attributes[a.id] ?? "";
                    const setA = (v: string) => setS((p) => ({ ...p, attributes: { ...p.attributes, [a.id]: v } }));
                    const label = `${name(a)}${a.unitLabel ? ` (${a.unitLabel})` : ""}`;
                    const err = errors[`attributes.${a.id}`];
                    const id = `attr-${a.key}`;
                    if (a.type === "select" && a.allowedValues?.length)
                      return (
                        <Field key={a.id} label={label} required={a.isRequired} htmlFor={id} error={err} hint={a.helpText ?? undefined}>
                          <Select id={id} value={val} onChange={(e) => setA(e.target.value)}>
                            <option value="">{t("form.selectOne")}</option>
                            {a.allowedValues.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      );
                    if (a.type === "boolean")
                      return (
                        <div key={a.id} className="mb-5">
                          <Checkbox label={label} checked={val === "true"} onChange={(e) => setA(e.target.checked ? "true" : "")} />
                        </div>
                      );
                    return (
                      <Field key={a.id} label={label} required={a.isRequired} htmlFor={id} error={err} hint={a.helpText ?? undefined}>
                        <Input id={id} type={a.type === "number" ? "number" : a.type === "date" ? "date" : "text"} inputMode={a.type === "number" ? "decimal" : undefined} step="any" className={a.type === "number" || a.type === "date" ? "font-latin" : ""} value={val} onChange={(e) => setA(e.target.value)} maxLength={200} aria-invalid={Boolean(err) || undefined} />
                      </Field>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <Field label={t("wizard.availableFrom")} htmlFor="avail">
              <Input id="avail" type="date" className="font-latin" value={s.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
            </Field>
            <Field label={t("wizard.description")} htmlFor="desc" hint={t("wizard.descriptionHint")}>
              <Textarea id="desc" value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} rows={5} />
            </Field>
            <fieldset className="border-t border-line pt-5">
              <legend className="mb-1 translate-y-[-1px] text-[14px] font-semibold text-ink">
                {t("wizard.documents")} {restricted ? <span className="text-danger">*</span> : <span className="text-[13px] font-normal text-muted">({t("common.optional")})</span>}
              </legend>
              {restricted && <p className="mb-2 text-[13px] font-medium text-warning">{t("wizard.documentsRequired")}</p>}
              <ListingDocumentUploader docs={s.documents} onChange={(d) => set("documents", d)} maxBytes={maxDocBytes} />
              {errors.documents && <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{errors.documents}</p>}
            </fieldset>
          </div>
        )}

        {/* ---------- Step 6 ---------- */}
        {step === 6 && form && commodity && (
          <div>
            <div className="panel panel-mint">
              <Facts
                items={[
                  { label: t("wizard.summary.what"), value: <span>{[commodityLabel(commodity, locale), varietyName ? name(varietyName) : s.customVariety.trim(), gradeName ? name(gradeName) : s.customGrade.trim()].filter(Boolean).join(" · ")}<span className="block text-[14px] font-normal text-ink-2">“{s.title || suggestedTitle}”</span></span> },
                  { label: t("wizard.summary.howMuch"), value: <span className="num">{formatNumber(s.quantity)} {unitSymbol(s.unitId)}{s.minOrderQuantity ? <span className="block text-[13px] font-normal text-ink-2">{t("common.minOrder")}: {formatNumber(s.minOrderQuantity)} {unitSymbol(s.minOrderUnitId)}</span> : null}</span> },
                  { label: t("wizard.summary.price"), value: <span className="num">{s.priceType === "fixed" || s.priceType === "negotiable" ? `${formatPKR(s.priceAmount)} / ${unitSymbol(s.priceUnitId)}` : t(`wizard.price.${s.priceType}`)}<span className="block text-[13px] font-normal text-ink-2">{t(`wizard.price.${s.priceType}`)}</span></span> },
                  { label: t("wizard.summary.where"), value: [cities.find((c) => c.id === s.cityId) && name(cities.find((c) => c.id === s.cityId)!), markets.find((m) => m.id === s.marketId) && name(markets.find((m) => m.id === s.marketId)!), s.pickupLocation, t(`listing.delivery.${s.deliveryAvailable}`)].filter(Boolean).join(" · ") },
                  { label: t("wizard.summary.details"), value: `${s.images.length} ${t("common.photos").toLowerCase()} · ${s.documents.length} ${t("wizard.documents").toLowerCase()}${s.packaging ? ` · ${s.packaging}` : ""}` },
                ]}
              />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setStep(n)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/80 px-3 text-[13px] font-semibold text-ink hover:bg-white">
                    <span className="num">0{n}.</span> {stepTitles[n - 1]}
                  </button>
                ))}
              </div>
            </div>
            {s.images.length > 0 && (
              <ul className="mt-4 flex gap-2 overflow-x-auto">
                {s.images.map((i) => (
                  <li key={i.path} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.url ?? `/files/public/${i.path}`} alt="" className="h-20 w-24 rounded-[var(--r-sm)] border border-line object-cover" />
                  </li>
                ))}
              </ul>
            )}
            <fieldset className="mt-6 border-t border-line pt-5">
              <legend className="translate-y-[-1px] text-[14px] font-semibold text-ink">{t("wizard.contactTitle")}</legend>
              <div className="mt-2 divide-y divide-line rounded-[var(--r-md)] border border-line px-4">
                {business.phone ? <Checkbox label={t("wizard.contactPhone", { phone: formatPhoneLocal(business.phone) })} checked={s.contactPhoneEnabled} onChange={(e) => set("contactPhoneEnabled", e.target.checked)} /> : null}
                {business.whatsapp ? <Checkbox label={t("wizard.contactWhatsapp", { phone: formatPhoneLocal(business.whatsapp) })} checked={s.contactWhatsappEnabled} onChange={(e) => set("contactWhatsappEnabled", e.target.checked)} /> : null}
                {!business.phone && !business.whatsapp && <p className="py-3 text-[14px] text-muted">{t("wizard.contactNone")}</p>}
              </div>
            </fieldset>
            <Alert tone={form.moderationLevel === "auto" ? "success" : "info"} className="mt-5">
              {form.moderationLevel === "auto" ? t("listing.create.autoPublish") : t("listing.create.afterSubmit")}
            </Alert>
          </div>
        )}
      </div>

      <div className="sticky bottom-[64px] z-30 -mx-4 mt-6 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mt-8 md:border-t md:bg-transparent md:px-0 md:pt-5 md:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" size="md" onClick={() => setStep((x) => x - 1)}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("action.back")}
              </Button>
            )}
            {commodity && !prohibited && (
              <span className="hidden sm:inline-flex">
                <Button type="button" variant="ghost" size="md" loading={pending} onClick={() => send(false)}>
                  <Save className="h-4 w-4" aria-hidden /> {t("wizard.saveDraft")}
                </Button>
              </span>
            )}
          </div>
          {step < TOTAL ? (
            <Button type="button" size="md" onClick={next} disabled={!commodity || prohibited || formLoading} className="min-w-[140px]">
              {t("action.next")} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : (
            <Button type="button" size="md" loading={pending} onClick={() => send(true)} disabled={prohibited} className="min-w-[160px]">
              {t("wizard.submit")}
            </Button>
          )}
        </div>
        {commodity && !prohibited && (
          <button type="button" disabled={pending} onClick={() => send(false)} className="mt-2 text-[13px] font-semibold text-muted underline underline-offset-4 sm:hidden">
            {t("wizard.saveDraft")}
          </button>
        )}
      </div>
    </div>
  );
}
