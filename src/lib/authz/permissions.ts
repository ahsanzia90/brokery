import type { Role } from "@/lib/auth/session";

/** Fine-grained permissions. Roles map to sets of these; checked server-side only. */
export const PERMISSIONS = [
  "admin.access",
  "users.view",
  "users.manage",
  "roles.manage",
  "verification.review",
  "taxonomy.manage",
  "listings.moderate",
  "prices.edit",
  "prices.publish",
  "enquiries.view",
  "reports.manage",
  "content.manage",
  "seo.manage",
  "settings.manage",
  "audit.view",
  "flags.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  buyer: [],
  seller: [],
  super_admin: [...PERMISSIONS],
  taxonomy_manager: ["admin.access", "taxonomy.manage"],
  price_editor: ["admin.access", "prices.edit", "prices.publish"],
  listing_moderator: ["admin.access", "listings.moderate", "reports.manage", "enquiries.view"],
  verification_reviewer: ["admin.access", "verification.review", "users.view"],
  content_editor: ["admin.access", "content.manage", "seo.manage"],
  support_agent: ["admin.access", "users.view", "enquiries.view", "reports.manage"],
};

export const ADMIN_ROLES: Role[] = [
  "super_admin",
  "taxonomy_manager",
  "price_editor",
  "listing_moderator",
  "verification_reviewer",
  "content_editor",
  "support_agent",
];

export function permissionsFor(roles: readonly Role[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) for (const p of ROLE_PERMISSIONS[r] ?? []) set.add(p);
  return set;
}

export function hasPermission(roles: readonly Role[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

export function isAdmin(roles: readonly Role[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export const ROLE_LABELS: Record<Role, string> = {
  buyer: "Buyer",
  seller: "Seller",
  super_admin: "Super admin",
  taxonomy_manager: "Taxonomy manager",
  price_editor: "Price editor",
  listing_moderator: "Listing moderator",
  verification_reviewer: "Verification reviewer",
  content_editor: "Content / SEO editor",
  support_agent: "Support agent",
};
