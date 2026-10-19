import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { ListingSearchParams, ListingSort } from "./listings";
import type { ListingFilterValues } from "@/components/marketplace/listing-filters";

export type SP = Record<string, string | string[] | undefined>;
export const s = (sp: SP, k: string) => {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

/** Parse URL search params into search params + filter form values. */
export function parseListingFilters(sp: SP, base: Partial<ListingSearchParams> = {}): { params: ListingSearchParams; values: ListingFilterValues; page: number } {
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) if (k.startsWith("attr_") && typeof v === "string" && v) attrs[k.slice(5)] = v;
  const sortRaw = s(sp, "sort");
  const sort: ListingSort | undefined = ["relevance", "newest", "price_asc", "price_desc", "updated"].includes(sortRaw) ? (sortRaw as ListingSort) : undefined;
  const page = Math.max(1, parseInt(s(sp, "page") || "1", 10) || 1);
  const num = (k: string) => {
    const n = Number(s(sp, k));
    return s(sp, k) && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const values: ListingFilterValues = {
    q: s(sp, "q"),
    variety: s(sp, "variety"),
    grade: s(sp, "grade"),
    city: s(sp, "city"),
    min: s(sp, "min"),
    max: s(sp, "max"),
    verified: s(sp, "verified"),
    fresh: s(sp, "fresh"),
    priceType: s(sp, "priceType"),
    delivery: s(sp, "delivery"),
    sort: sortRaw,
    attrs,
  };
  const params: ListingSearchParams = {
    ...base,
    q: base.q ?? (values.q || null),
    varietyId: values.variety || base.varietyId || null,
    gradeId: values.grade || null,
    cityId: values.city || base.cityId || null,
    minPrice: num("min"),
    maxPrice: num("max"),
    verifiedOnly: values.verified === "1",
    freshnessDays: num("fresh"),
    priceType: values.priceType || null,
    deliveryAvailable: values.delivery === "1",
    attributeFilters: attrs,
    sort,
    page,
  };
  return { params, values, page };
}

/** Rebuild a URL keeping current params but changing page. */
export function pageHref(base: string, sp: SP, page: number): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") u.set(k, v);
  if (page > 1) u.set("page", String(page));
  const q = u.toString();
  return q ? `${base}?${q}` : base;
}

export const lname = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");
