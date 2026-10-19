import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { CurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz/permissions";
import { LanguageSwitcher } from "./language-switcher";
import { SearchBar } from "./search-bar";
import { MobileMenu } from "./mobile-menu";

export function Header({ t, locale, user, brandName, currentPath, unreadCount, logoPath }: { t: Translator; locale: Locale; user: CurrentUser | null; brandName: string; currentPath: string; unreadCount: number; logoPath: string | null }) {
  const nav = [
    { href: "/prices", label: t("nav.prices") },
    { href: "/suppliers", label: t("nav.suppliers") },
    { href: "/categories", label: t("nav.commodities") },
    { href: "/guides", label: t("nav.guides") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="container-page flex min-h-[64px] items-center gap-3 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold text-primary-strong" aria-label={brandName}>
          {logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/files/public/${logoPath}`} alt={brandName} className="h-9 w-auto" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white" aria-hidden>
              M
            </span>
          )}
          <span className="font-latin">{brandName}</span>
        </Link>
        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-[8px] px-3 py-2 font-semibold hover:bg-surface-muted ${currentPath.startsWith(n.href) ? "text-primary" : ""}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto hidden items-center gap-2 md:flex">
          <LanguageSwitcher locale={locale} next={currentPath} compact />
          {user ? (
            <>
              <Link href="/notifications" className="relative rounded-[8px] px-3 py-2 font-semibold hover:bg-surface-muted" aria-label={t("nav.notifications")}>
                {t("nav.notifications")}
                {unreadCount > 0 && <span className="absolute -top-1 -end-1 rounded-full bg-danger px-1.5 text-xs font-bold text-white num">{unreadCount}</span>}
              </Link>
              {isAdmin(user.roles) && (
                <Link href="/admin" className="rounded-[8px] px-3 py-2 font-semibold text-accent hover:bg-surface-muted">
                  {t("nav.admin")}
                </Link>
              )}
              <Link href={user.isSeller ? "/dashboard/seller" : "/dashboard/buyer"} className="rounded-[var(--radius)] border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary-soft">
                {t("nav.account")}
              </Link>
            </>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(currentPath)}`} className="rounded-[var(--radius)] bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-strong">
              {t("nav.login")}
            </Link>
          )}
        </div>
        <div className="ms-auto md:hidden">
          <MobileMenu
            labels={{ menu: t("nav.menu"), close: t("nav.close"), login: t("nav.login"), account: t("nav.account"), admin: t("nav.admin"), notifications: t("nav.notifications"), language: t("nav.language") }}
            nav={[{ href: "/", label: t("nav.home") }, ...nav, { href: "/sell", label: t("nav.sell") }, { href: "/buy", label: t("nav.buy") }]}
            user={user ? { isSeller: user.isSeller, isAdmin: isAdmin(user.roles) } : null}
            locale={locale}
            currentPath={currentPath}
            unreadCount={unreadCount}
          />
        </div>
      </div>
      <div className="container-page pb-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
