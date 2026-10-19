import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { getCommodityBySlug, getPopularCommodities } from "./taxonomy";
import { getCities, getMajorCities } from "./locations";
import { searchSuppliers } from "./suppliers";
import { lname, s, type SP } from "./browse-helpers";

export async function loadSupplierDirectory(sp: SP, locale: Locale, fixedCityId?: string | null) {
  const q = s(sp, "q");
  const commoditySlug = s(sp, "commodity");
  const verification = s(sp, "verification");
  const page = Math.max(1, parseInt(s(sp, "page") || "1", 10) || 1);
  const commodity = commoditySlug ? await getCommodityBySlug(commoditySlug) : null;
  const [cities, major, popular] = await Promise.all([getCities(), getMajorCities(), getPopularCommodities(30)]);
  const cityOptions = [...major, ...cities.filter((c) => !c.isMajorMarket)].map((c) => ({ value: c.slug, label: lname(locale, c) }));
  const commodityOptions = popular.map((c) => ({ value: c.slug, label: lname(locale, c) }));
  if (commodity && !commodityOptions.some((o) => o.value === commodity.slug)) commodityOptions.unshift({ value: commodity.slug, label: lname(locale, commodity) });
  const citySlug = s(sp, "city");
  const cityId = fixedCityId ?? (citySlug ? (cities.find((c) => c.slug === citySlug)?.id ?? null) : null);
  const levels = verification === "verified" ? ["phone_verified", "documents_reviewed", "admin_verified"] : verification ? [verification] : null;
  const result = await searchSuppliers({ q, cityId, commodityId: commodity?.id ?? null, verificationLevels: levels, page, pageSize: 18 }, locale);
  return { result, cityOptions, commodityOptions, values: { q, city: citySlug, commodity: commoditySlug, verification } };
}
