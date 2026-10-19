import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";

export function BottomNav({ t, currentPath, isSeller }: { t: Translator; currentPath: string; isSeller: boolean }) {
  const items = [
    { href: "/", label: t("nav.home"), icon: "🏠" },
    { href: "/prices", label: t("nav.prices"), icon: "📈" },
    { href: "/suppliers", label: t("nav.suppliers"), icon: "🏪" },
    { href: isSeller ? "/dashboard/seller" : "/dashboard/buyer", label: t("nav.account"), icon: "👤" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden" aria-label="Primary mobile">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/" ? currentPath === "/" : currentPath.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-primary" : "text-text-muted"}`} aria-current={active ? "page" : undefined}>
                <span className="text-xl" aria-hidden>
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
