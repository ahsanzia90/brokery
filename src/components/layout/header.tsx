import Link from "next/link";
import { Bell } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { CurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz/permissions";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";
import { SignInLink } from "./sign-in-link";
import { buttonClass } from "@/components/ui/button";
import { ActiveLink } from "@/components/ui/active-link";

export function Header({ t, locale, user, brandName, unreadCount, logoPath }: { t: Translator; locale: Locale; user: CurrentUser | null; brandName: string; unreadCount: number; logoPath: string | null }) {
  const nav = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/categories", label: t("nav.commodities") },
    { href: "/suppliers", label: t("nav.suppliers") },
    { href: "/guides", label: t("nav.guides") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-8 md:h-[72px]">
        <Link href="/" className="shrink-0" aria-label={brandName}>
          <Logo name={brandName} logoPath={logoPath} />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => (
            <ActiveLink key={n.href} href={n.href} className="whitespace-nowrap rounded-[var(--r-sm)] px-3.5 py-2 text-[15px] font-semibold transition-colors" activeClassName="bg-brand-50 text-brand-900" inactiveClassName="text-ink-2 hover:bg-surface-2 hover:text-ink">
              {n.label}
            </ActiveLink>
          ))}
        </nav>
        <div className="ms-auto hidden shrink-0 items-center gap-3 md:flex">
          <LanguageSwitcher locale={locale} />
          {user ? (
            <>
              <Link href="/notifications" className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={t("nav.notifications")}>
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 && <span className="absolute -top-0.5 -end-0.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white num">{unreadCount}</span>}
              </Link>
              {isAdmin(user.roles) && (
                <Link href="/admin" className={buttonClass("ghost", "md")}>
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
              <SignInLink label={t("nav.login")} />
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
            unreadCount={unreadCount}
          />
        </div>
      </div>
    </header>
  );
}
