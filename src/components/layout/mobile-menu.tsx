"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";
import { buttonClass } from "@/components/ui/button";

export function MobileMenu({ labels, nav, user, locale, currentPath, unreadCount }: { labels: Record<string, string>; nav: Array<{ href: string; label: string }>; user: { isSeller: boolean; isAdmin: boolean } | null; locale: Locale; currentPath: string; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? labels.close : labels.menu} onClick={() => setOpen((o) => !o)} className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] border border-line text-ink">
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto bg-white px-5 pb-24 pt-2">
          <ul className="divide-y divide-line">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className={`block py-3.5 text-[17px] font-semibold ${currentPath === n.href ? "text-brand-800" : "text-ink"}`}>
                  {n.label}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                <li>
                  <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-between py-3.5 text-[17px] font-semibold">
                    {labels.notifications}
                    {unreadCount > 0 && <span className="rounded-full bg-danger px-2 text-[12px] font-bold text-white num">{unreadCount}</span>}
                  </Link>
                </li>
                {user.isAdmin && (
                  <li>
                    <Link href="/admin" onClick={() => setOpen(false)} className="block py-3.5 text-[17px] font-semibold text-lime-900">
                      {labels.admin}
                    </Link>
                  </li>
                )}
              </>
            ) : null}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {user ? (
              <Link href={user.isSeller ? "/dashboard/seller" : "/dashboard/buyer"} onClick={() => setOpen(false)} className={buttonClass("outline", "lg")}>
                {labels.account}
              </Link>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(currentPath)}`} onClick={() => setOpen(false)} className={buttonClass("outline", "lg")}>
                {labels.login}
              </Link>
            )}
            <Link href={user ? "/dashboard/seller/listings/new" : "/sell"} onClick={() => setOpen(false)} className={buttonClass("primary", "lg")}>
              {labels.sell}
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <span className="text-[14px] font-medium text-muted">{labels.language}</span>
            <LanguageSwitcher locale={locale} next={currentPath} />
          </div>
        </div>
      )}
    </>
  );
}
