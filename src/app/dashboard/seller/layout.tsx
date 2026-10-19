import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = { title: "Seller dashboard", ...NOINDEX };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requireUserPage("/dashboard/seller");
  const { t } = await getT();
  const h = await headers();
  const path = h.get("x-current-path") ?? "/dashboard/seller";
  const tabs = [
    { href: "/dashboard/seller", label: t("seller.nav.overview"), exact: true },
    { href: "/dashboard/seller/listings", label: t("seller.nav.listings") },
    { href: "/dashboard/seller/enquiries", label: t("seller.nav.enquiries") },
    { href: "/dashboard/seller/business", label: t("seller.nav.business") },
    { href: "/dashboard/seller/verification", label: t("seller.nav.verification") },
  ];
  return (
    <div className="container-page py-6">
      <nav aria-label={t("dash.seller.title")} className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1 whitespace-nowrap">
          {tabs.map((tab) => {
            const active = tab.exact ? path === tab.href : path.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={active ? "page" : undefined} className={`inline-block min-h-[48px] border-b-4 px-3 py-3 font-semibold ${active ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li className="ms-auto">
            <Link href="/dashboard/buyer" className="inline-block min-h-[48px] px-3 py-3 text-sm font-semibold text-accent">
              {t("seller.switchBuyer")} ›
            </Link>
          </li>
        </ul>
      </nav>
      {children}
    </div>
  );
}
