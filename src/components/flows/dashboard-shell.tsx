import Link from "next/link";
import type { ComponentType } from "react";
import { FileText, ArrowLeftRight } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";
import type { CurrentUser } from "@/lib/auth/session";
import { enableSellerAction } from "@/lib/auth/actions";
import { ShellNavLink, type ShellItem } from "./shell-nav-link";

type Mode = "buyer" | "seller";
type Item = ShellItem;

export function dashboardItems(mode: Mode, t: Translator, badges: Partial<Record<string, number>> = {}): Item[] {
  if (mode === "seller") {
    return [
      { href: "/dashboard/seller", label: t("dash.nav.overview"), icon: "LayoutDashboard", exact: true },
      { href: "/dashboard/seller/listings", label: t("dash.nav.listings"), icon: "Package", badge: badges.listings },
      { href: "/dashboard/seller/enquiries", label: t("dash.nav.enquiries"), icon: "Inbox", badge: badges.enquiries },
      { href: "/dashboard/seller/business", label: t("dash.nav.business"), icon: "Briefcase" },
      { href: "/dashboard/seller/verification", label: t("dash.nav.verification"), icon: "ShieldCheck" },
      { href: "/favorites", label: t("dash.nav.favorites"), icon: "Heart" },
      { href: "/notifications", label: t("dash.nav.notifications"), icon: "Bell", badge: badges.notifications },
      { href: "/account", label: t("dash.nav.account"), icon: "Settings" },
    ];
  }
  return [
    { href: "/dashboard/buyer", label: t("dash.nav.overview"), icon: "LayoutDashboard", exact: true },
    { href: "/dashboard/buyer/requests", label: t("dash.nav.requests"), icon: "ClipboardList", badge: badges.requests },
    { href: "/favorites", label: t("dash.nav.favorites"), icon: "Heart" },
    { href: "/notifications", label: t("dash.nav.notifications"), icon: "Bell", badge: badges.notifications },
    { href: "/account", label: t("dash.nav.account"), icon: "Settings" },
  ];
}

/**
 * Signed-in shell: left rail on desktop, horizontally scrolling segmented tabs on mobile,
 * with a buyer ⇄ seller mode switch. Pure layout; pages render their own headers.
 */
export function DashboardShell({ mode, t, user, badges, children, title }: { mode: Mode; currentPath?: string; t: Translator; user: CurrentUser; badges?: Partial<Record<string, number>>; children: React.ReactNode; title?: string }) {
  const items = dashboardItems(mode, t, badges);
  const otherMode: Mode = mode === "seller" ? "buyer" : "seller";
  const switchHref = otherMode === "seller" ? "/dashboard/seller" : "/dashboard/buyer";
  return (
    <div className="container-page py-5 md:py-8">
      <div className="md:grid md:grid-cols-[232px_1fr] md:gap-10">
        <aside className="mb-5 md:mb-0">
          {/* mode switch */}
          <div className="mb-4 hidden items-center justify-between rounded-[var(--r-md)] bg-surface-2 p-1 md:flex" role="group" aria-label={t("account.roles")}>
            {(["buyer", "seller"] as Mode[]).map((m) => {
              const active = m === mode;
              const cls = `flex h-9 flex-1 items-center justify-center rounded-[6px] text-[13px] font-semibold ${active ? "bg-surface text-ink shadow-[var(--shadow-xs)]" : "text-muted hover:text-ink"}`;
              if (m === "seller" && !user.isSeller) {
                return (
                  <form key={m} action={enableSellerAction} className="flex-1">
                    <button type="submit" className={`${cls} w-full`}>{t("dash.mode.seller")}</button>
                  </form>
                );
              }
              return (
                <Link key={m} href={m === "seller" ? "/dashboard/seller" : "/dashboard/buyer"} className={cls} aria-current={active ? "page" : undefined}>
                  {t(`dash.mode.${m}`)}
                </Link>
              );
            })}
          </div>
          <nav aria-label={title ?? t(mode === "seller" ? "dash.seller.title" : "dash.buyer.title")}>
            {/* mobile: scrolling tabs */}
            <div className="md:hidden">
            <ul className="scroll-x -mx-4 px-4">
              {items.map((it) => (
                <li key={it.href}>
                  <ShellNavLink item={it} variant="tab" />
                </li>
              ))}
              {user.isSeller ? (
                <li>
                  <Link href={switchHref} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 text-[13px] font-semibold text-brand-800">
                    <ArrowLeftRight className="h-4 w-4" /> {t(`dash.mode.${otherMode}`)}
                  </Link>
                </li>
              ) : null}
            </ul>
            </div>
            {/* desktop: rail */}
            <ul className="hidden space-y-0.5 md:block">
              {items.map((it) => (
                <li key={it.href}>
                  <ShellNavLink item={it} variant="rail" />
                </li>
              ))}
            </ul>
          </nav>
          {mode === "seller" && (
            <Link href={`/dashboard/seller/listings/new`} className="mt-5 hidden h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-brand-800 text-[14px] font-semibold text-white hover:bg-brand-900 md:flex">
              <FileText className="h-4 w-4" /> {t("action.createListing")}
            </Link>
          )}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Page header inside the dashboard: title + optional description + actions, aligned to a baseline. */
export function DashHeader({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Compact stat strip: numbers separated by dividers, not identical cards. */
export function StatStrip({ items }: { items: Array<{ label: string; value: React.ReactNode; href?: string; hint?: string; tone?: "default" | "warning" }> }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--r-md)] border border-line bg-surface sm:grid-cols-3 lg:flex">
      {items.map((it) => {
        const body = (
          <>
            <dt className="min-h-[32px] text-[11px] font-semibold uppercase leading-4 tracking-wide text-muted">{it.label}</dt>
            <dd className={`mt-1 text-[24px] font-extrabold leading-none num ${it.tone === "warning" ? "text-warning" : "text-ink"}`}>{it.value}</dd>
            {it.hint && <dd className="mt-1 text-[12px] text-muted">{it.hint}</dd>}
          </>
        );
        const cls = "flex-1 border-b border-e border-line p-4 last:border-e-0 sm:[&:nth-child(3n)]:border-e-0 lg:border-b-0 lg:[&:nth-child(3n)]:border-e lg:last:border-e-0";
        return it.href ? (
          <Link key={it.label} href={it.href} className={`${cls} hover:bg-surface-2`}>
            {body}
          </Link>
        ) : (
          <div key={it.label} className={cls}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}

/** "Needs your attention" list — the action queue, visually first. */
export function AttentionList({ title, items, allClear }: { title: string; items: Array<{ label: string; href: string; Icon: ComponentType<{ className?: string }>; tone?: "warning" | "info" | "success" }>; allClear: string }) {
  return (
    <section className="self-start rounded-[var(--r-lg)] bg-tint-sand p-5">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted">{allClear}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.href + it.label}>
              <Link href={it.href} className="flex items-center gap-3 rounded-[var(--r-sm)] bg-white/70 px-3 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-white">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${it.tone === "warning" ? "bg-warning-bg text-warning" : it.tone === "success" ? "bg-success-bg text-success" : "bg-info-bg text-info"}`}>
                  <it.Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">{it.label}</span>
                <span className="text-muted-2" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Segmented tabs (status filters) used by list pages. */
export function SegmentedTabs({ tabs, current }: { tabs: Array<{ href: string; label: string; count?: number; key: string }>; current: string }) {
  return (
    <div className="mb-5 sm:inline-flex sm:rounded-[var(--r-md)] sm:bg-surface-2 sm:p-1">
    <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:flex sm:gap-0.5 sm:overflow-visible sm:px-0 sm:pb-0">
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link key={tab.key} href={tab.href} aria-current={active ? "page" : undefined} className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3.5 text-[13px] font-semibold ${active ? "bg-surface text-ink shadow-[var(--shadow-xs)] ring-1 ring-line sm:ring-0" : "text-muted hover:text-ink"}`}>
            {tab.label}
            {typeof tab.count === "number" && <span className={`rounded-full px-1.5 text-[11px] num ${active ? "bg-brand-50 text-brand-900" : "bg-line text-ink-2"}`}>{tab.count}</span>}
          </Link>
        );
      })}
    </div>
    </div>
  );
}
