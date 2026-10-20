"use client";
import { Bell, Briefcase, ClipboardList, Heart, Inbox, LayoutDashboard, Package, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { ActiveLink } from "@/components/ui/active-link";

const ICONS: Record<string, LucideIcon> = { Bell, Briefcase, ClipboardList, Heart, Inbox, LayoutDashboard, Package, Settings, ShieldCheck };

export type ShellItem = { href: string; label: string; icon: string; exact?: boolean; badge?: number };

/** Rail (desktop) or tab (mobile) link whose active state follows the live URL. */
export function ShellNavLink({ item, variant }: { item: ShellItem; variant: "rail" | "tab" }) {
  const Icon = ICONS[item.icon] ?? Package;
  if (variant === "tab") {
    return (
      <ActiveLink href={item.href} exact={item.exact} className="inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold" activeClassName="border-ink bg-ink text-white" inactiveClassName="border-line bg-surface text-ink-2">
        {(active) => (
          <>
            <Icon className="h-4 w-4" strokeWidth={2} />
            {item.label}
            {item.badge ? <span className={`rounded-full px-1.5 text-[11px] num ${active ? "bg-lime-500 text-brand-950" : "bg-danger text-white"}`}>{item.badge}</span> : null}
          </>
        )}
      </ActiveLink>
    );
  }
  return (
    <ActiveLink href={item.href} exact={item.exact} className="flex h-11 items-center gap-3 rounded-[var(--r-sm)] px-3 text-[15px] font-semibold transition-colors" activeClassName="bg-brand-50 text-brand-900" inactiveClassName="text-ink-2 hover:bg-surface-2 hover:text-ink">
      {(active) => (
        <>
          <Icon className={`h-[18px] w-[18px] ${active ? "text-brand-800" : "text-muted"}`} strokeWidth={2} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge ? <span className="rounded-full bg-danger px-1.5 text-[11px] font-bold leading-[18px] text-white num">{item.badge}</span> : null}
        </>
      )}
    </ActiveLink>
  );
}
