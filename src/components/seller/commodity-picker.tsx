"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { inputClass } from "@/components/ui/form";

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
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-primary bg-primary-soft px-3.5 py-3">
        <div>
          <p className="text-sm text-text-muted">{t("wizard.chosen")}</p>
          <p className="text-lg font-bold">{commodityLabel(value, locale)}</p>
          {value.categoryName && <p className="text-sm text-text-muted">{locale === "ur" && value.categoryNameUr ? value.categoryNameUr : value.categoryName}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="min-h-[44px] rounded-[8px] border border-border-strong bg-surface px-3 font-semibold">
          {t("wizard.change")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
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
        className={inputClass}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius)] border border-border bg-surface shadow-md">
          {loading && items.length === 0 && <li className="px-3.5 py-3 text-text-muted">{t("common.loading")}</li>}
          {!loading && items.length === 0 && <li className="px-3.5 py-3 text-text-muted">{t("form.noMatches")}</li>}
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
                className="flex w-full min-h-[48px] items-center justify-between gap-3 px-3.5 py-2 text-start hover:bg-surface-muted"
              >
                <span className="font-medium">{commodityLabel(c, locale)}</span>
                <span className="text-sm text-text-muted">{locale === "ur" && c.categoryNameUr ? c.categoryNameUr : c.categoryName}</span>
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
              <button type="button" onClick={() => toggle(c)} className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-primary-soft px-3 text-sm font-semibold text-primary-strong">
                {commodityLabel(c, locale)} <span aria-hidden>✕</span>
                <span className="sr-only">{t("action.remove")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("form.searchPlaceholder")} className={inputClass} aria-label={t("biz.commodities")} />
      <ul className="mt-2 max-h-64 overflow-auto rounded-[var(--radius)] border border-border bg-surface">
        {items.length === 0 && <li className="px-3 py-3 text-text-muted">{t("form.noMatches")}</li>}
        {items.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={isSel(c.id)} onChange={() => toggle(c)} />
              <span className="font-medium">{commodityLabel(c, locale)}</span>
              <span className="ms-auto text-sm text-text-muted">{locale === "ur" && c.categoryNameUr ? c.categoryNameUr : c.categoryName}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
