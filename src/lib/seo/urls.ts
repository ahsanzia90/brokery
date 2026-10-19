/** Canonical URL builders — one consistent strategy for the whole site. */
export const urls = {
  home: () => "/",
  categories: () => "/categories",
  category: (slug: string) => `/categories/${slug}`,
  commodity: (slug: string) => `/commodities/${slug}`,
  variety: (commoditySlug: string, varietySlug: string) => `/commodities/${commoditySlug}/${varietySlug}`,
  commodityCity: (commoditySlug: string, citySlug: string) => `/commodities/${commoditySlug}/city/${citySlug}`,
  listings: () => "/listings",
  listing: (slug: string) => `/listings/${slug}`,
  prices: () => "/prices",
  pricesCommodity: (slug: string) => `/prices/${slug}`,
  pricesCommodityCity: (slug: string, citySlug: string) => `/prices/${slug}/${citySlug}`,
  suppliers: () => "/suppliers",
  suppliersCity: (citySlug: string) => `/suppliers/${citySlug}`,
  supplier: (slug: string) => `/supplier/${slug}`,
  markets: () => "/markets",
  market: (path: string) => `/markets/${path}`,
  guides: () => "/guides",
  guide: (slug: string) => `/guides/${slug}`,
  page: (slug: string) => `/${slug}`,
  search: (q: string, city?: string) => `/search?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ""}`,
  sell: () => "/sell",
  buy: () => "/buy",
  rfqNew: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return `/rfq/new${qs ? `?${qs}` : ""}`;
  },
  rfq: (id: string) => `/rfq/${id}`,
  login: (next?: string) => `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  dashboardBuyer: () => "/dashboard/buyer",
  dashboardSeller: () => "/dashboard/seller",
  listingNew: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : "";
    return `/dashboard/seller/listings/new${qs ? `?${qs}` : ""}`;
  },
  account: () => "/account",
  favorites: () => "/favorites",
  notifications: () => "/notifications",
  admin: () => "/admin",
};
