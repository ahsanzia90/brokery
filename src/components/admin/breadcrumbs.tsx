"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin/nav";

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

export function AdminBreadcrumbs() {
  const crumbs = crumbsFor(usePathname() ?? "/admin");
  return (
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
  );
}
