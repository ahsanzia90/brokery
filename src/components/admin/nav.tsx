"use client";
import Link from "next/link";
import { useState } from "react";
import type { AdminNavItem } from "@/lib/admin/nav";

export function AdminNav({ items, currentPath }: { items: AdminNavItem[]; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  const isActive = (href: string) => (href === "/admin" ? currentPath === "/admin" : currentPath === href || (currentPath.startsWith(href + "/") && !items.some((o) => o.href !== href && o.href.startsWith(href + "/") && currentPath.startsWith(o.href))));
  return (
    <nav aria-label="Admin" className="px-2 pb-2">
      <button type="button" className="mb-2 w-full rounded-[8px] border border-border px-3 py-2 text-start font-semibold lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide menu" : "Show menu"}
      </button>
      <div className={`${open ? "block" : "hidden"} lg:block`}>
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-text-muted">{g}</p>
            <ul>
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} onClick={() => setOpen(false)} className={`block rounded-[8px] px-3 py-2 text-[0.95rem] font-medium ${isActive(i.href) ? "bg-primary-soft text-primary-strong" : "hover:bg-surface-muted"}`} aria-current={isActive(i.href) ? "page" : undefined}>
                      {i.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
