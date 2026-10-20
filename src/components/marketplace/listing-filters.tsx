import { SlidersHorizontal } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";
import { buttonClass } from "@/components/ui/button";
import { AutoSubmitForm } from "@/components/public/auto-submit";

export type FilterOption = { value: string; label: string };
export type AttributeFilter = { key: string; label: string; type: string; allowedValues: string[] | null; unitLabel: string | null };

export type ListingFilterValues = {
  q?: string;
  variety?: string;
  grade?: string;
  city?: string;
  min?: string;
  max?: string;
  verified?: string;
  fresh?: string;
  priceType?: string;
  delivery?: string;
  sort?: string;
  attrs?: Record<string, string>;
};

/** Compact "Label: Value" select, like the reference filter bar. */
function FilterSelect({ label, name, value, children }: { label: string; name: string; value?: string; children: React.ReactNode }) {
  return (
    <label className="inline-flex h-10 min-w-0 items-center gap-1 rounded-[var(--r-sm)] border border-line-strong bg-surface ps-3 pe-2 text-[14px] shadow-[var(--shadow-xs)] focus-within:border-brand-700 focus-within:ring-4 focus-within:ring-brand-800/10">
      <span className="shrink-0 text-muted">{label}:</span>
      <select name={name} defaultValue={value ?? ""} className="min-w-0 max-w-[160px] cursor-pointer appearance-none bg-transparent pe-5 font-semibold text-ink outline-none" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2368746d' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right center" }}>
        {children}
      </select>
    </label>
  );
}

function FilterInput({ label, name, value, type = "text", placeholder }: { label: string; name: string; value?: string; type?: string; placeholder?: string }) {
  return (
    <label className="inline-flex h-10 items-center gap-1 rounded-[var(--r-sm)] border border-line-strong bg-surface ps-3 pe-2 text-[14px] shadow-[var(--shadow-xs)] focus-within:border-brand-700 focus-within:ring-4 focus-within:ring-brand-800/10">
      <span className="shrink-0 text-muted">{label}:</span>
      <input type={type} inputMode={type === "number" ? "numeric" : undefined} min={type === "number" ? 0 : undefined} name={name} defaultValue={value ?? ""} placeholder={placeholder} className="w-24 min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted-2 font-latin" />
    </label>
  );
}

function Toggle({ label, name, checked }: { label: string; name: string; checked?: boolean }) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border border-line-strong bg-surface px-3 text-[14px] font-semibold text-ink-2 shadow-[var(--shadow-xs)] has-[:checked]:border-brand-800 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="h-4 w-4 accent-[var(--brand-800)]" />
      {label}
    </label>
  );
}

/**
 * Server-rendered GET filter bar. Selects auto-submit; text inputs submit on Enter / Apply.
 * Only filters relevant to the context are shown (pass empty arrays to hide).
 */
export function ListingFilters({ t, action, values, varieties = [], grades = [], cities, attributes = [], hidden = {}, showQuery = false, showSort = true }: { t: Translator; action: string; values: ListingFilterValues; varieties?: FilterOption[]; grades?: FilterOption[]; cities: FilterOption[]; attributes?: AttributeFilter[]; hidden?: Record<string, string | undefined>; showQuery?: boolean; showSort?: boolean }) {
  const activeCount = [values.variety, values.grade, values.city, values.min, values.max, values.verified, values.fresh, values.priceType, values.delivery, ...Object.values(values.attrs ?? {})].filter(Boolean).length;
  const controls = (
    <>
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {showQuery && <FilterInput label={t("nav.search")} name="q" value={values.q} placeholder={t("form.searchPlaceholder")} />}
      {varieties.length > 0 && (
        <FilterSelect label={t("common.variety")} name="variety" value={values.variety}>
          <option value="">{t("common.all")}</option>
          {varieties.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>
      )}
      {grades.length > 0 && (
        <FilterSelect label={t("common.grade")} name="grade" value={values.grade}>
          <option value="">{t("common.all")}</option>
          {grades.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>
      )}
      {cities.length > 0 && (
        <FilterSelect label={t("common.city")} name="city" value={values.city}>
          <option value="">{t("common.all")}</option>
          {cities.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>
      )}
      <FilterSelect label={t("search.priceType")} name="priceType" value={values.priceType}>
        <option value="">{t("common.any")}</option>
        <option value="fixed">{t("price.fixed")}</option>
        <option value="negotiable">{t("price.negotiable")}</option>
        <option value="quote">{t("price.quote")}</option>
        <option value="on_contact">{t("price.onContact")}</option>
      </FilterSelect>
      <FilterInput label={t("search.minPrice")} name="min" value={values.min} type="number" placeholder="Rs." />
      <FilterInput label={t("search.maxPrice")} name="max" value={values.max} type="number" placeholder="Rs." />
      <FilterSelect label={t("search.freshness")} name="fresh" value={values.fresh}>
        <option value="">{t("common.any")}</option>
        <option value="7">{t("search.freshness.7")}</option>
        <option value="30">{t("search.freshness.30")}</option>
        <option value="90">{t("search.freshness.90")}</option>
      </FilterSelect>
      {attributes.map((a) =>
        a.type === "select" && a.allowedValues?.length ? (
          <FilterSelect key={a.key} label={a.label} name={`attr_${a.key}`} value={values.attrs?.[a.key]}>
            <option value="">{t("common.any")}</option>
            {a.allowedValues.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </FilterSelect>
        ) : (
          <FilterInput key={a.key} label={`${a.label}${a.unitLabel ? ` (${a.unitLabel})` : ""}`} name={`attr_${a.key}`} value={values.attrs?.[a.key]} type={a.type === "number" ? "number" : "text"} />
        ),
      )}
      <Toggle label={t("search.verifiedOnly")} name="verified" checked={values.verified === "1"} />
      <Toggle label={t("search.deliveryAvailable")} name="delivery" checked={values.delivery === "1"} />
      {showSort && (
        <FilterSelect label={t("common.sort")} name="sort" value={values.sort}>
          <option value="">{t("common.sort.relevance")}</option>
          <option value="newest">{t("common.sort.newest")}</option>
          <option value="updated">{t("common.sort.updated")}</option>
          <option value="price_asc">{t("common.sort.priceAsc")}</option>
          <option value="price_desc">{t("common.sort.priceDesc")}</option>
        </FilterSelect>
      )}
      <button type="submit" className={buttonClass("primary", "sm", "h-10")}>
        {t("action.apply")}
      </button>
      {activeCount > 0 && (
        <a href={action} className={buttonClass("ghost", "sm", "h-10")}>
          {t("action.clear")}
        </a>
      )}
    </>
  );
  return (
    <div className="mb-5">
      {/* desktop: single wrapping toolbar */}
      <AutoSubmitForm action={action} className="hidden flex-wrap items-center gap-2 md:flex">
        {controls}
      </AutoSubmitForm>
      {/* mobile: collapsible sheet */}
      <details className="md:hidden" open={activeCount > 0}>
        <summary className={buttonClass("outline", "md", "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> {t("browse.showFilters")}
          {activeCount > 0 && <span className="rounded-full bg-brand-800 px-2 text-[12px] font-bold text-white num">{activeCount}</span>}
        </summary>
        <AutoSubmitForm action={action} className="mt-3 grid grid-cols-1 gap-2 rounded-[var(--r-md)] border border-line bg-surface-2 p-3 [&>label]:w-full [&>label>select]:w-full [&>label>select]:max-w-none [&>label>input]:w-full [&>button]:w-full [&>a]:w-full">
          {controls}
        </AutoSubmitForm>
      </details>
    </div>
  );
}
