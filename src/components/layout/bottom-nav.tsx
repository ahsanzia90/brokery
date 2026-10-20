import Link from "next/link";
import { Home, LineChart, Store, User, PlusCircle } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";

export function BottomNav({ t, currentPath, isSeller }: { t: Translator; currentPath: string; isSeller: boolean }) {
  const items = [
    { href: "/", label: t("nav.home"), Icon: Home },
    { href: "/prices", label: t("nav.prices"), Icon: LineChart },
    { href: isSeller ? "/dashboard/seller/listings/new" : "/sell", label: t("nav.sell"), Icon: PlusCircle, primary: true },
    { href: "/suppliers", label: t("nav.suppliers"), Icon: Store },
    { href: isSeller ? "/dashboard/seller" : "/dashboard/buyer", label: t("nav.account"), Icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Primary mobile">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon, primary }) => {
          const active = href === "/" ? currentPath === "/" : currentPath.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${primary ? "text-brand-800" : active ? "text-brand-800" : "text-muted"}`}>
                <span className={primary ? "-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-800 text-white shadow-[var(--shadow-md)]" : ""}>
                  <Icon className={primary ? "h-6 w-6" : "h-5 w-5"} strokeWidth={active || primary ? 2.4 : 2} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
