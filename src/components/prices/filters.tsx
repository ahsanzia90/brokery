import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { buttonClass } from "@/components/ui/button";

type Opt = { id: string; slug: string; nameEn: string; nameUr: string | null };

const chevron =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368746d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")";

/** Compact "Label: Value" select used in filter rows across the public site. */
function LabeledSelect({ label, name, value, children }: { label: string; name: string; value: string; children: React.ReactNode }) {
  return (
    <label className="inline-flex h-11 min-w-0 items-center rounded-[var(--r-sm)] border border-line-strong bg-surface ps-3 text-[14px] shadow-[var(--shadow-xs)] focus-within:border-brand-700 focus-within:ring-4 focus-within:ring-brand-800/10">
      <span className="shrink-0 text-muted">{label}:</span>
      <select name={name} defaultValue={value} className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent bg-no-repeat pe-9 ps-1.5 font-semibold text-ink outline-none" style={{ backgroundImage: chevron, backgroundPosition: "right 0.6rem center" }}>
        {children}
      </select>
    </label>
  );
}

export function PriceFilters({ t, locale, commodities, cities, priceTypes, selected, action = "/prices", hideCommodity }: { t: Translator; locale: Locale; commodities: Opt[]; cities: Opt[]; priceTypes: string[]; selected: { commodity?: string; city?: string; type?: string }; action?: string; hideCommodity?: boolean }) {
  const name = (o: Opt) => (locale === "ur" && o.nameUr ? o.nameUr : o.nameEn);
  const active = Boolean(selected.commodity || selected.city || selected.type);
  return (
    <form method="get" action={action} className="mb-6 flex flex-wrap items-center gap-2" aria-label={t("price.filterRates")}>
      {!hideCommodity && (
        <LabeledSelect label={t("common.commodity")} name="commodity" value={selected.commodity ?? ""}>
          <option value="">{t("common.all")}</option>
          {commodities.map((c) => (
            <option key={c.id} value={c.slug}>
              {name(c)}
            </option>
          ))}
        </LabeledSelect>
      )}
      <LabeledSelect label={t("common.city")} name="city" value={selected.city ?? ""}>
        <option value="">{t("common.all")}</option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug}>
            {name(c)}
          </option>
        ))}
      </LabeledSelect>
      <LabeledSelect label={t("search.priceType")} name="type" value={selected.type ?? ""}>
        <option value="">{t("common.all")}</option>
        {priceTypes.map((p) => (
          <option key={p} value={p}>
            {t(`price.type.${p}`)}
          </option>
        ))}
      </LabeledSelect>
      <button type="submit" className={buttonClass("primary", "md")}>
        {t("action.apply")}
      </button>
      {active && (
        <a href={action} className={buttonClass("ghost", "md")}>
          {t("action.clear")}
        </a>
      )}
    </form>
  );
}
