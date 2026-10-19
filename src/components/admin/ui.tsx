import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function AdminPageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Array<{ label: string; href?: string }> }) {
  return (
    <header className="mb-6">
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-text-muted">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {i > 0 && " › "}
              {b.href ? (
                <Link href={b.href} className="hover:underline">
                  {b.label}
                </Link>
              ) : (
                b.label
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function StatCard({ label, value, href, hint, tone }: { label: string; value: ReactNode; href?: string; hint?: string; tone?: "warning" | "danger" | "default" }) {
  const inner = (
    <div className={cn("card p-4", tone === "warning" && "border-warning/40 bg-warning-soft", tone === "danger" && "border-danger/40 bg-danger-soft")}>
      <p className="text-sm font-semibold text-text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold num">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-[0.95rem]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border bg-surface-muted px-3 py-2 text-start text-sm font-bold text-text-muted", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-3 py-2 align-top", className)}>{children}</td>;
}

export function FilterBar({ children, action = "" }: { children: ReactNode; action?: string }) {
  return (
    <form method="get" action={action} className="mb-4 flex flex-wrap items-end gap-3">
      {children}
    </form>
  );
}

/** Simple server-rendered pagination using ?page= */
export function AdminPagination({ page, totalPages, makeHref }: { page: number; totalPages: number; makeHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-text-muted num">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={makeHref(page - 1)} className="rounded-[8px] border border-border px-3 py-1.5 font-semibold">
            ‹ Prev
          </Link>
        )}
        {page < totalPages && (
          <Link href={makeHref(page + 1)} className="rounded-[8px] border border-border px-3 py-1.5 font-semibold">
            Next ›
          </Link>
        )}
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-text-muted">
        {children}
      </td>
    </tr>
  );
}
