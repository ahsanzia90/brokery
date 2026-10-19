"use client";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";

export function MobileMenu({ labels, nav, user, locale, currentPath, unreadCount }: { labels: Record<string, string>; nav: Array<{ href: string; label: string }>; user: { isSeller: boolean; isAdmin: boolean } | null; locale: Locale; currentPath: string; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)} className="flex min-h-[44px] items-center gap-2 rounded-[8px] border border-border px-3 font-semibold">
        <span aria-hidden>☰</span>
        {open ? labels.close : labels.menu}
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface p-4 shadow-md">
          <ul className="flex flex-col divide-y divide-border">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold">
                  {n.label}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                <li>
                  <Link href="/notifications" onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold">
                    {labels.notifications} {unreadCount > 0 && <span className="rounded-full bg-danger px-2 text-sm text-white num">{unreadCount}</span>}
                  </Link>
                </li>
                {user.isAdmin && (
                  <li>
                    <Link href="/admin" onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold text-accent">
                      {labels.admin}
                    </Link>
                  </li>
                )}
                <li>
                  <Link href={user.isSeller ? "/dashboard/seller" : "/dashboard/buyer"} onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold text-primary">
                    {labels.account}
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link href={`/login?next=${encodeURIComponent(currentPath)}`} onClick={() => setOpen(false)} className="block py-3 text-lg font-semibold text-primary">
                  {labels.login}
                </Link>
              </li>
            )}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-text-muted">{labels.language}</span>
            <LanguageSwitcher locale={locale} next={currentPath} />
          </div>
        </div>
      )}
    </>
  );
}
