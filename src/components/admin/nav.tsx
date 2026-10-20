"use client";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, BookOpen, CornerDownRight, FileText, Flag, FolderTree, Globe, Inbox, LayoutDashboard, LayoutTemplate, LineChart, MapPin, Menu, MessageSquareText, Package, Scale, ScrollText, Settings, SlidersHorizontal, Store, ToggleLeft, Upload, Users, X, type LucideIcon } from "lucide-react";
import type { AdminNavItem } from "@/lib/admin/nav";

const ICONS: Record<string, LucideIcon> = { BadgeCheck, BookOpen, CornerDownRight, FileText, Flag, FolderTree, Globe, Inbox, LayoutDashboard, LayoutTemplate, LineChart, MapPin, MessageSquareText, Package, Scale, ScrollText, Settings, SlidersHorizontal, Store, ToggleLeft, Upload, Users };

export function AdminNav({ items, currentPath }: { items: AdminNavItem[]; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  const isActive = (href: string) => (href === "/admin" ? currentPath === "/admin" : currentPath === href || (currentPath.startsWith(href + "/") && !items.some((o) => o.href !== href && o.href.startsWith(href + "/") && currentPath.startsWith(o.href))));
  return (
    <nav aria-label="Admin" className="px-3 pb-3">
      <button type="button" className="mb-2 flex h-9 w-full items-center gap-2 rounded-[var(--r-sm)] border border-white/15 px-3 text-[13px] font-medium text-white/90 lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />} {open ? "Hide menu" : "Menu"}
      </button>
      <div className={`${open ? "block" : "hidden"} lg:block`}>
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{g}</p>
            <ul className="space-y-0.5">
              {items
                .filter((i) => i.group === g)
                .map((i) => {
                  const Icon = ICONS[i.icon] ?? Package;
                  const active = isActive(i.href);
                  return (
                    <li key={i.href}>
                      <Link href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex h-9 items-center gap-2.5 rounded-[var(--r-sm)] px-3 text-[13.5px] font-medium transition-colors ${active ? "bg-white/[0.14] text-white" : "text-white/75 hover:bg-white/[0.08] hover:text-white"}`}>
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-lime-400" : "text-white/60"}`} strokeWidth={2} aria-hidden />
                        <span className="truncate">{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
