import Link from "next/link";
import { Bell } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { CurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz/permissions";
import { LanguageSwitcher } from "./language-switcher";
import { SearchBar } from "./search-bar";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";
import { buttonClass } from "@/components/ui/button";

export function Header({ t, locale, user, brandName, currentPath, unreadCount, logoPath }: { t: Translator; locale: Locale; user: CurrentUser | null; brandName: string; currentPath: string; unreadCount: number; logoPath: string | null }) {
  const nav = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/categories", label: t("nav.commodities") },
    { href: "/suppliers", label: t("nav.suppliers") },
    { href: "/guides", label: t("nav.guides") },
  ];
  const isHome = currentPath === "/";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6 md:h-[72px]">
        <Link href="/" className="shrink-0">
          <Logo name={brandName} logoPath={logoPath} />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => {
            const active = currentPath === n.href || currentPath.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-[var(--r-sm)] px-3 py-2 text-[15px] font-semibold transition-colors ${active ? "bg-brand-50 text-brand-900" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        {!isHome && (
          <div className="hidden min-w-0 max-w-xs flex-1 lg:block xl:max-w-md">
            <SearchBar size="sm" />
          </div>
        )}
        <div className="ms-auto hidden shrink-0 items-center gap-2 md:flex">
          <LanguageSwitcher locale={locale} next={currentPath} compact />
          {user ? (
            <>
              <Link href="/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={t("nav.notifications")}>
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 && <span className="absolute -top-0.5 -end-0.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white num">{unreadCount}</span>}
              </Link>
              {isAdmin(user.roles) && (
                <Link href="/admin" className={buttonClass("ghost", "sm")}>
                  {t("nav.admin")}
                </Link>
              )}
              <Link href={user.isSeller ? "/dashboard/seller" : "/dashboard/buyer"} className={buttonClass("outline", "md")}>
                {t("nav.account")}
              </Link>
              <Link href="/dashboard/seller/listings/new" className={buttonClass("primary", "md")}>
                {t("nav.sellCta")}
              </Link>
            </>
          ) : (
            <>
              <Link href={`/login?next=${encodeURIComponent(currentPath)}`} className={buttonClass("outline", "md")}>
                {t("nav.login")}
              </Link>
              <Link href="/sell" className={buttonClass("primary", "md")}>
                {t("nav.sellCta")}
              </Link>
            </>
          )}
        </div>
        <div className="ms-auto md:hidden">
          <MobileMenu
            labels={{ menu: t("nav.menu"), close: t("nav.close"), login: t("nav.login"), account: t("nav.account"), admin: t("nav.admin"), notifications: t("nav.notifications"), language: t("nav.language"), sell: t("nav.sellCta") }}
            nav={[{ href: "/", label: t("nav.home") }, ...nav, { href: "/buy", label: t("nav.buy") }, { href: "/sell", label: t("nav.sell") }]}
            user={user ? { isSeller: user.isSeller, isAdmin: isAdmin(user.roles) } : null}
            locale={locale}
            currentPath={currentPath}
            unreadCount={unreadCount}
          />
        </div>
      </div>
      {!isHome && (
        <div className="container-page pb-3 md:hidden">
          <SearchBar size="sm" />
        </div>
      )}
    </header>
  );
}
