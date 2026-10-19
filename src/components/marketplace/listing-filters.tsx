import type { Translator } from "@/lib/i18n/translate";
import { inputClass } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";

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

/**
 * Server-rendered GET form. Only the filters relevant to the current context are
 * shown (callers pass empty arrays to hide variety/grade/attribute filters).
 */
export function ListingFilters({
  t,
  action,
  values,
  varieties = [],
  grades = [],
  cities,
  attributes = [],
  hidden = {},
  showQuery = false,
  showSort = true,
}: {
  t: Translator;
  action: string;
  values: ListingFilterValues;
  varieties?: FilterOption[];
  grades?: FilterOption[];
  cities: FilterOption[];
  attributes?: AttributeFilter[];
  hidden?: Record<string, string | undefined>;
  showQuery?: boolean;
  showSort?: boolean;
}) {
  const sel = `${inputClass} min-h-[44px] py-1.5`;
  return (
    <details className="card mb-5 p-4" open={Boolean(values.variety || values.grade || values.city || values.min || values.max || values.verified || values.fresh || values.priceType || values.delivery || (values.attrs && Object.keys(values.attrs).length))}>
      <summary className="cursor-pointer text-base font-bold">
        {t("search.filters")} <span className="text-sm font-normal text-text-muted">({t("action.filter")} / {t("common.sort")})</span>
      </summary>
      <form method="get" action={action} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        {showQuery && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">{t("nav.search")}</span>
            <input type="search" name="q" defaultValue={values.q ?? ""} className={sel} />
          </label>
        )}
        {varieties.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("common.variety")}</span>
            <select name="variety" defaultValue={values.variety ?? ""} className={sel}>
              <option value="">{t("common.all")}</option>
              {varieties.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {grades.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("common.grade")}</span>
            <select name="grade" defaultValue={values.grade ?? ""} className={sel}>
              <option value="">{t("common.all")}</option>
              {grades.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("common.city")}</span>
          <select name="city" defaultValue={values.city ?? ""} className={sel}>
            <option value="">{t("common.all")}</option>
            {cities.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("search.minPrice")}</span>
            <input type="number" inputMode="numeric" min={0} name="min" defaultValue={values.min ?? ""} className={`${sel} font-latin`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("search.maxPrice")}</span>
            <input type="number" inputMode="numeric" min={0} name="max" defaultValue={values.max ?? ""} className={`${sel} font-latin`} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("search.priceType")}</span>
          <select name="priceType" defaultValue={values.priceType ?? ""} className={sel}>
            <option value="">{t("common.any")}</option>
            <option value="fixed">{t("price.fixed")}</option>
            <option value="negotiable">{t("price.negotiable")}</option>
            <option value="quote">{t("price.quote")}</option>
            <option value="on_contact">{t("price.onContact")}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("search.freshness")}</span>
          <select name="fresh" defaultValue={values.fresh ?? ""} className={sel}>
            <option value="">{t("common.any")}</option>
            <option value="7">{t("search.freshness.7")}</option>
            <option value="30">{t("search.freshness.30")}</option>
            <option value="90">{t("search.freshness.90")}</option>
          </select>
        </label>
        {attributes.map((a) => (
          <label key={a.key} className="block">
            <span className="mb-1 block text-sm font-semibold">
              {a.label}
              {a.unitLabel ? ` (${a.unitLabel})` : ""}
            </span>
            {a.type === "select" && a.allowedValues?.length ? (
              <select name={`attr_${a.key}`} defaultValue={values.attrs?.[a.key] ?? ""} className={sel}>
                <option value="">{t("common.any")}</option>
                {a.allowedValues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input type={a.type === "number" ? "number" : "text"} name={`attr_${a.key}`} defaultValue={values.attrs?.[a.key] ?? ""} className={`${sel} font-latin`} />
            )}
          </label>
        ))}
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4 lg:flex-row lg:items-center">
          <label className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name="verified" value="1" defaultChecked={values.verified === "1"} className="h-5 w-5 accent-[var(--color-primary)]" />
            <span>{t("search.verifiedOnly")}</span>
          </label>
          <label className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name="delivery" value="1" defaultChecked={values.delivery === "1"} className="h-5 w-5 accent-[var(--color-primary)]" />
            <span>{t("search.deliveryAvailable")}</span>
          </label>
          {showSort && (
            <label className="flex items-center gap-2 lg:ms-auto">
              <span className="text-sm font-semibold">{t("common.sort")}</span>
              <select name="sort" defaultValue={values.sort ?? ""} className={`${sel} w-auto`}>
                <option value="">{t("common.sort.relevance")}</option>
                <option value="newest">{t("common.sort.newest")}</option>
                <option value="updated">{t("common.sort.updated")}</option>
                <option value="price_asc">{t("common.sort.priceAsc")}</option>
                <option value="price_desc">{t("common.sort.priceDesc")}</option>
              </select>
            </label>
          )}
          <button type="submit" className={buttonClass("primary", "md")}>
            {t("action.apply")}
          </button>
          <a href={action} className={buttonClass("ghost", "md")}>
            {t("action.clear")}
          </a>
        </div>
      </form>
    </details>
  );
}
