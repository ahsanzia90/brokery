import type { Permission } from "@/lib/authz/permissions";

export type AdminNavItem = { href: string; label: string; permission: Permission; group: string; icon: string };

/** icon = lucide icon name resolved in components/admin/nav.tsx */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", permission: "admin.access", group: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/listings", label: "Listings", permission: "listings.moderate", group: "Marketplace", icon: "Package" },
  { href: "/admin/verifications", label: "Supplier verification", permission: "verification.review", group: "Marketplace", icon: "BadgeCheck" },
  { href: "/admin/businesses", label: "Businesses", permission: "verification.review", group: "Marketplace", icon: "Store" },
  { href: "/admin/enquiries", label: "Buyer enquiries", permission: "enquiries.view", group: "Marketplace", icon: "MessageSquareText" },
  { href: "/admin/reports", label: "Reports & cases", permission: "reports.manage", group: "Marketplace", icon: "Flag" },
  { href: "/admin/prices", label: "Market prices", permission: "prices.edit", group: "Market data", icon: "LineChart" },
  { href: "/admin/prices/sources", label: "Price sources", permission: "prices.edit", group: "Market data", icon: "BookOpen" },
  { href: "/admin/prices/import", label: "Import CSV", permission: "prices.edit", group: "Market data", icon: "Upload" },
  { href: "/admin/taxonomy", label: "Categories & commodities", permission: "taxonomy.manage", group: "Taxonomy", icon: "FolderTree" },
  { href: "/admin/taxonomy/attributes", label: "Attributes", permission: "taxonomy.manage", group: "Taxonomy", icon: "SlidersHorizontal" },
  { href: "/admin/taxonomy/units", label: "Units", permission: "taxonomy.manage", group: "Taxonomy", icon: "Scale" },
  { href: "/admin/taxonomy/locations", label: "Locations", permission: "taxonomy.manage", group: "Taxonomy", icon: "MapPin" },
  { href: "/admin/taxonomy/requests", label: "Taxonomy requests", permission: "taxonomy.manage", group: "Taxonomy", icon: "Inbox" },
  { href: "/admin/users", label: "Users & roles", permission: "users.view", group: "People", icon: "Users" },
  { href: "/admin/content", label: "Pages & guides", permission: "content.manage", group: "Content", icon: "FileText" },
  { href: "/admin/content/homepage", label: "Homepage sections", permission: "content.manage", group: "Content", icon: "LayoutTemplate" },
  { href: "/admin/seo", label: "SEO metadata", permission: "seo.manage", group: "Content", icon: "Globe" },
  { href: "/admin/seo/redirects", label: "Redirects", permission: "seo.manage", group: "Content", icon: "CornerDownRight" },
  { href: "/admin/settings", label: "Settings", permission: "settings.manage", group: "System", icon: "Settings" },
  { href: "/admin/settings/flags", label: "Feature flags", permission: "flags.manage", group: "System", icon: "ToggleLeft" },
  { href: "/admin/audit", label: "Audit logs", permission: "audit.view", group: "System", icon: "ScrollText" },
];
