import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { getAttributesForCommodity, getCategoryAncestors, getCommodityBySlug, getCommoditiesInCategory, getGrades, getVarieties, type CommodityRow } from "./taxonomy";
import { getCities, getMajorCities } from "./locations";
import type { AttributeFilter, FilterOption } from "@/components/marketplace/listing-filters";
import { lname } from "./browse-helpers";

/** Everything the commodity-family pages share. */
export async function loadCommodityContext(slug: string, locale: Locale) {
  const commodity = await getCommodityBySlug(slug);
  if (!commodity) return null;
  const [ancestors, varieties, grades, attributes, cities, majorCities] = await Promise.all([
    getCategoryAncestors(commodity.categoryId),
    getVarieties(commodity.id),
    getGrades(commodity.id),
    getAttributesForCommodity(commodity),
    getCities(),
    getMajorCities(),
  ]);
  const related = (await getCommoditiesInCategory(commodity.categoryId, false)).filter((c) => c.id !== commodity.id).slice(0, 12);
  const varietyOptions: FilterOption[] = varieties.map((v) => ({ value: v.id, label: lname(locale, v) }));
  const gradeOptions: FilterOption[] = grades.map((g) => ({ value: g.id, label: lname(locale, g) }));
  const cityOptions: FilterOption[] = [...majorCities, ...cities.filter((c) => !c.isMajorMarket)].map((c) => ({ value: c.id, label: lname(locale, c) }));
  const attributeFilters: AttributeFilter[] = attributes.filter((a) => a.isFilterable).map((a) => ({ key: a.key, label: lname(locale, a), type: a.type, allowedValues: a.allowedValues, unitLabel: a.unitLabel }));
  return { commodity, ancestors, varieties, grades, attributes, related, varietyOptions, gradeOptions, cityOptions, attributeFilters };
}

export function commodityTitle(commodity: CommodityRow, locale: Locale) {
  return lname(locale, commodity);
}
