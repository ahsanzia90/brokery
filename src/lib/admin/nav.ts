import type { Permission } from "@/lib/authz/permissions";

export type AdminNavItem = { href: string; label: string; permission: Permission; group: string };

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", permission: "admin.access", group: "Overview" },
  { href: "/admin/listings", label: "Listings", permission: "listings.moderate", group: "Marketplace" },
  { href: "/admin/verifications", label: "Supplier verification", permission: "verification.review", group: "Marketplace" },
  { href: "/admin/enquiries", label: "Buyer enquiries", permission: "enquiries.view", group: "Marketplace" },
  { href: "/admin/reports", label: "Reports & cases", permission: "reports.manage", group: "Marketplace" },
  { href: "/admin/prices", label: "Market prices", permission: "prices.edit", group: "Market data" },
  { href: "/admin/prices/sources", label: "Price sources", permission: "prices.edit", group: "Market data" },
  { href: "/admin/prices/import", label: "Import CSV", permission: "prices.edit", group: "Market data" },
  { href: "/admin/taxonomy", label: "Categories & commodities", permission: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/taxonomy/attributes", label: "Attributes", permission: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/taxonomy/units", label: "Units", permission: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/taxonomy/locations", label: "Locations", permission: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/taxonomy/requests", label: "Taxonomy requests", permission: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/users", label: "Users & roles", permission: "users.view", group: "People" },
  { href: "/admin/content", label: "Pages & guides", permission: "content.manage", group: "Content" },
  { href: "/admin/content/homepage", label: "Homepage sections", permission: "content.manage", group: "Content" },
  { href: "/admin/seo", label: "SEO metadata", permission: "seo.manage", group: "Content" },
  { href: "/admin/seo/redirects", label: "Redirects", permission: "seo.manage", group: "Content" },
  { href: "/admin/settings", label: "Settings", permission: "settings.manage", group: "System" },
  { href: "/admin/settings/flags", label: "Feature flags", permission: "flags.manage", group: "System" },
  { href: "/admin/audit", label: "Audit logs", permission: "audit.view", group: "System" },
];
