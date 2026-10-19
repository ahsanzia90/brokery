import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { getBrand } from "@/lib/config/settings";
import { logoutAction } from "@/lib/auth/actions";
import { NOINDEX } from "@/lib/seo/metadata";
import { AdminNav } from "@/components/admin/nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, ...NOINDEX };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const brand = await getBrand();
  const h = await headers();
  const currentPath = h.get("x-current-path") ?? "/admin";
  const items = ADMIN_NAV.filter((i) => hasPermission(user.roles, i.permission));
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-surface lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-extrabold text-primary-strong font-latin">
            {brand.name} <span className="text-sm font-semibold text-accent">Admin</span>
          </Link>
          <Link href="/" className="text-sm text-text-muted hover:underline">
            ← Site
          </Link>
        </div>
        <AdminNav items={items} currentPath={currentPath} />
        <div className="border-t border-border px-4 py-3 text-sm text-text-muted">
          <p className="truncate font-semibold text-text">{user.name || user.phone}</p>
          <p className="truncate">{user.roles.filter((r) => r !== "buyer" && r !== "seller").join(", ")}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-1 text-primary hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
