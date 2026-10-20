import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, ExternalLink } from "lucide-react";
import "@/components/admin/admin.css";
import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { getBrand } from "@/lib/config/settings";
import { logoutAction } from "@/lib/auth/actions";
import { NOINDEX } from "@/lib/seo/metadata";
import { AdminNav } from "@/components/admin/nav";
import { Avatar } from "@/components/admin/ui";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, ...NOINDEX };

function crumbsFor(path: string): Array<{ label: string; href?: string }> {
  const segs = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const out: Array<{ label: string; href?: string }> = [{ label: "Admin", href: "/admin" }];
  let acc = "/admin";
  for (const s of segs) {
    acc += `/${s}`;
    const item = ADMIN_NAV.find((n) => n.href === acc);
    const label = item?.label ?? (/^[0-9a-f-]{36}$/i.test(s) ? "Detail" : s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
    out.push({ label, href: acc });
  }
  return out;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const brand = await getBrand();
  const h = await headers();
  const currentPath = h.get("x-current-path") ?? "/admin";
  const items = ADMIN_NAV.filter((i) => hasPermission(user.roles, i.permission));
  const crumbs = crumbsFor(currentPath);
  const adminRoles = user.roles.filter((r) => r !== "buyer" && r !== "seller");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <div className="bg-brand-950">
      <aside className="flex flex-col bg-brand-950 text-white lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex h-14 items-center px-5">
          <Link href="/admin" className="inline-flex items-center gap-2 font-latin text-[18px] font-extrabold tracking-[-0.02em]">
            <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
              <rect width="26" height="26" rx="7" fill="#c7ef6e" />
              <path d="M7 18V8l6 6 6-6v10" stroke="#0b3d29" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            {brand.name}
            <span className="rounded-full bg-lime-500/20 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-lime-400">Admin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto pt-1">
          <AdminNav items={items} currentPath={currentPath} />
        </div>
        <div className="hidden items-center gap-3 border-t border-white/10 px-4 py-3 lg:flex">
          <Avatar name={user.name || user.phone} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{user.name || user.phone}</p>
            <p className="truncate text-[11px] text-white/55">{adminRoles.map((r) => r.replace(/_/g, " ")).join(", ")}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-[12px] font-medium text-white/60 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      </div>
      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-white/90 px-4 backdrop-blur lg:px-8">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px] text-muted">
            {crumbs.map((c, i) => (
              <span key={c.href ?? i} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden />}
                {i < crumbs.length - 1 && c.href ? (
                  <Link href={c.href} className="truncate hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-ink">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <Link href="/" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] border border-line px-3 text-[12px] font-medium text-ink-2 hover:bg-surface-2">
            View site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="px-4 py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
