import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { Select } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";

type Opt = { id: string; slug: string; nameEn: string; nameUr: string | null };

export function PriceFilters({ t, locale, commodities, cities, priceTypes, selected, action = "/prices", hideCommodity }: { t: Translator; locale: Locale; commodities: Opt[]; cities: Opt[]; priceTypes: string[]; selected: { commodity?: string; city?: string; type?: string }; action?: string; hideCommodity?: boolean }) {
  const name = (o: Opt) => (locale === "ur" && o.nameUr ? o.nameUr : o.nameEn);
  return (
    <form method="get" action={action} className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("price.filterRates")}>
      {!hideCommodity && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("common.commodity")}</span>
          <Select name="commodity" defaultValue={selected.commodity ?? ""}>
            <option value="">{t("price.allCommodities")}</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.slug}>
                {name(c)}
              </option>
            ))}
          </Select>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t("common.city")}</span>
        <Select name="city" defaultValue={selected.city ?? ""}>
          <option value="">{t("price.allCities")}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {name(c)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t("search.priceType")}</span>
        <Select name="type" defaultValue={selected.type ?? ""}>
          <option value="">{t("price.allTypes")}</option>
          {priceTypes.map((p) => (
            <option key={p} value={p}>
              {t(`price.type.${p}`)}
            </option>
          ))}
        </Select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
          {t("action.apply")}
        </button>
        <a href={action} className={buttonClass("outline", "md")}>
          {t("action.clear")}
        </a>
      </div>
    </form>
  );
}
