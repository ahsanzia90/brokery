"use client";
import { Home, LineChart, Store, User, PlusCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { ActiveLink } from "@/components/ui/active-link";

export function BottomNav({ isSeller }: { isSeller: boolean }) {
  const { t } = useI18n();
  const items = [
    { href: "/", label: t("nav.home"), Icon: Home, exact: true },
    { href: "/prices", label: t("nav.prices"), Icon: LineChart },
    { href: isSeller ? "/dashboard/seller/listings/new" : "/sell", label: t("nav.sell"), Icon: PlusCircle, primary: true },
    { href: "/suppliers", label: t("nav.suppliers"), Icon: Store },
    { href: isSeller ? "/dashboard/seller" : "/dashboard/buyer", label: t("nav.account"), Icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Primary mobile">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon, primary, exact }) => (
          <li key={href}>
            <ActiveLink href={href} exact={exact} className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold" activeClassName="text-brand-800" inactiveClassName={primary ? "text-brand-800" : "text-muted"}>
              {(active) => (
                <>
                  <span className={primary ? "-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-800 text-white shadow-[var(--shadow-md)]" : ""}>
                    <Icon className={primary ? "h-6 w-6" : "h-5 w-5"} strokeWidth={active || primary ? 2.4 : 2} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </ActiveLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
