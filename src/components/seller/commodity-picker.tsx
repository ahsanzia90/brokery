"use client";
import { CommodityVisual } from "@/components/marketplace/commodity-visual";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { inputClass } from "@/components/ui/form";
import { Search, X } from "lucide-react";
import { artKeyFor, artTint } from "@/components/illustrations/commodity-art";

export type CommodityOption = { id: string; slug: string; nameEn: string; nameUr: string | null; categoryName?: string | null; categoryNameUr?: string | null };

export function commodityLabel(c: CommodityOption, locale: string) {
  return locale === "ur" && c.nameUr ? c.nameUr : c.nameEn;
}

/** Searchable single-select of commodities (typo tolerant, aliases in Urdu/Roman Urdu). */
export function CommodityPicker({ value, onChange, categoryId, autoFocus, placeholder }: { value: CommodityOption | null; onChange: (c: CommodityOption | null) => void; categoryId?: string | null; autoFocus?: boolean; placeholder?: string }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CommodityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const id = useId();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (categoryId) params.set("category", categoryId);
        const res = await fetch(`/api/taxonomy/commodities?${params}`, { signal: ctrl.signal });
        if (res.ok) setItems(((await res.json()) as { items: CommodityOption[] }).items);
      } catch {
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [q, categoryId]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-brand-800 bg-brand-50 p-3 ring-1 ring-brand-800">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${artTint[artKeyFor(value.slug, value.nameEn)]}`}>
          <CommodityVisual slug={value.slug} name={value.nameEn} className="h-10 w-10" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">{t("wizard.chosen")}</p>
          <p className="truncate text-[17px] font-bold text-ink">{commodityLabel(value, locale)}</p>
          {value.categoryName && <p className="truncate text-[13px] text-muted">{locale === "ur" && value.categoryNameUr ? value.categoryNameUr : value.categoryName}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[var(--r-sm)] border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-2">
          <X className="h-4 w-4" aria-hidden /> {t("wizard.change")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={id}
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder ?? t("sell.pickHint")}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        className={`${inputClass} h-12 ps-10 text-[16px]`}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-[var(--r-md)] border border-line bg-surface p-1.5 shadow-[var(--shadow-lg)]">
          {loading && items.length === 0 && <li className="px-3.5 py-3 text-[14px] text-muted">{t("common.loading")}</li>}
          {!loading && items.length === 0 && <li className="px-3.5 py-3 text-[14px] text-muted">{t("form.noMatches")}</li>}
          {items.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-[var(--r-sm)] px-2.5 py-2 text-start hover:bg-surface-2"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] ${artTint[artKeyFor(c.slug, c.nameEn)]}`}>
                  <CommodityVisual slug={c.slug} name={c.nameEn} className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{commodityLabel(c, locale)}</span>
                  <span className="block truncate text-[12px] text-muted">{locale === "ur" && c.categoryNameUr ? c.categoryNameUr : c.categoryName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Multi-select checklist used in the business profile. */
export function CommodityChecklist({ selected, onChange }: { selected: CommodityOption[]; onChange: (next: CommodityOption[]) => void }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CommodityOption[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/taxonomy/commodities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setItems(((await res.json()) as { items: CommodityOption[] }).items);
      } catch {}
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);
  const isSel = (id: string) => selected.some((s) => s.id === id);
  const toggle = (c: CommodityOption) => onChange(isSel(c.id) ? selected.filter((s) => s.id !== c.id) : [...selected, c]);
  return (
    <div>
      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label={t("biz.selected", { count: selected.length })}>
          {selected.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => toggle(c)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-50 ps-3 pe-2 text-[13px] font-semibold text-brand-900 hover:bg-brand-100">
                {commodityLabel(c, locale)} <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{t("action.remove")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("form.searchPlaceholder")} className={`${inputClass} ps-10`} aria-label={t("biz.commodities")} />
      </div>
      <ul className="mt-2 max-h-64 divide-y divide-line overflow-auto rounded-[var(--r-md)] border border-line bg-surface">
        {items.length === 0 && <li className="px-3 py-3 text-[14px] text-muted">{t("form.noMatches")}</li>}
        {items.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-2">
              <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--brand-800)]" checked={isSel(c.id)} onChange={() => toggle(c)} />
              <span className="text-[14px] font-semibold text-ink">{commodityLabel(c, locale)}</span>
              <span className="ms-auto truncate text-[12px] text-muted">{locale === "ur" && c.categoryNameUr ? c.categoryNameUr : c.categoryName}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
