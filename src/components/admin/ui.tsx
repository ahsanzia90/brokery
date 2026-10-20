import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, MoreHorizontal, Search } from "lucide-react";
import { cn } from "@/components/ui/cn";

/* ---------------------------------------------------------------- page header */
export function AdminPageHeader({ title, description, actions, breadcrumbs, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Array<{ label: string; href?: string }>; meta?: ReactNode }) {
  return (
    <header className="mb-5">
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1 text-[12px] text-muted">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-2" aria-hidden />}
              {b.href ? (
                <Link href={b.href} className="hover:text-ink">
                  {b.label}
                </Link>
              ) : (
                <span className="max-w-[320px] truncate text-ink-2">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-ink">{title}</h1>
          {meta && <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">{meta}</div>}
          {description && <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- panels */
export function Panel({ title, description, actions, children, className, padded = true, id }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; id?: string }) {
  return (
    <section id={id} className={cn("rounded-[var(--r-md)] border border-line bg-surface shadow-[var(--shadow-xs)]", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-[14px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[12px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** Compact strip of KPI cells divided by hairlines (replaces identical metric cards). */
export function StatStrip({ items, className }: { items: Array<{ label: string; value: ReactNode; hint?: string; href?: string; tone?: "default" | "warning" | "danger" }>; className?: string }) {
  return (
    <div className={cn("grid overflow-hidden rounded-[var(--r-md)] border border-line bg-surface shadow-[var(--shadow-xs)] sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr", className)}>
      {items.map((it, i) => {
        const inner = (
          <>
            <p className="text-[12px] font-medium text-muted">{it.label}</p>
            <p className={cn("mt-1 text-[24px] font-semibold leading-none tracking-tight num", it.tone === "warning" ? "text-warning" : it.tone === "danger" ? "text-danger" : "text-ink")}>{it.value}</p>
            {it.hint && <p className="mt-1.5 text-[11px] leading-snug text-muted-2">{it.hint}</p>}
          </>
        );
        const cls = cn("px-5 py-4 border-line", i > 0 && "border-t sm:border-t-0 sm:border-s", "sm:[&:nth-child(3n+1)]:border-s-0 lg:[&:nth-child(3n+1)]:border-s lg:first:border-s-0");
        return it.href ? (
          <Link key={it.label} href={it.href} className={cn(cls, "block hover:bg-surface-2")}>
            {inner}
          </Link>
        ) : (
          <div key={it.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Backwards-compatible single stat card (kept for pages that still use it). */
export function StatCard({ label, value, href, hint, tone }: { label: string; value: ReactNode; href?: string; hint?: string; tone?: "warning" | "danger" | "default" }) {
  return <StatStrip items={[{ label, value, href, hint, tone }]} />;
}

/** Queue rows: icon, label, count pill, action link. */
export function AttentionList({ items, allClearText = "Nothing waiting. All queues are clear." }: { items: Array<{ icon: ReactNode; label: string; count: number; href?: string; hint?: string; tone?: "warning" | "danger" | "info" }>; allClearText?: string }) {
  const pending = items.filter((i) => i.count > 0);
  if (!pending.length) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 text-[14px] text-ink-2">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> {allClearText}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {pending.map((i) => (
        <li key={i.label} className="flex items-center gap-3 px-5 py-3">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)]", i.tone === "danger" ? "bg-danger-bg text-danger" : i.tone === "info" ? "bg-info-bg text-info" : "bg-warning-bg text-warning")}>{i.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-ink">{i.label}</span>
            {i.hint && <span className="block text-[12px] text-muted">{i.hint}</span>}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[13px] font-semibold text-ink num">{i.count}</span>
          {i.href && (
            <Link href={i.href} className="adm-btn-outline h-8 px-3 text-[12px]">
              Review
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- table */
export function Table({ children, className, minWidth = 720 }: { children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn("adm-table overflow-x-auto rounded-[var(--r-md)] border border-line bg-surface shadow-[var(--shadow-xs)]", className)}>
      <table className="w-full text-[14px] [&_tbody_tr:hover]:bg-surface-2/70 [&_tbody_tr:last-child_td]:border-b-0" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap border-b border-line bg-surface px-4 py-2.5 text-[12px] font-semibold text-muted", className?.includes("text-end") || className?.includes("text-center") ? "" : "text-start", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle text-ink-2 [tr>&:first-child]:font-medium [tr>&:first-child]:text-ink", className)}>{children}</td>;
}
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-[13px] text-muted">
        {children}
      </td>
    </tr>
  );
}
/** Avatar initials tile for name cells. */
export function Avatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .replace(/^\[sample\]\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/files/public/${src}`} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-900" style={{ width: size, height: size }} aria-hidden>
      {initials || "?"}
    </span>
  );
}
export function NameCell({ name, sub, src, href }: { name: string; sub?: ReactNode; src?: string | null; href?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar name={name} src={src} />
      <span className="min-w-0">
        {href ? (
          <Link href={href} className="block truncate font-medium text-ink hover:text-brand-800">
            {name}
          </Link>
        ) : (
          <span className="block truncate font-medium text-ink">{name}</span>
        )}
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}
/** Grey chip for plain tags (bank-name style in the reference). */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-[6px] bg-surface-2 px-2 py-0.5 text-[12px] font-medium capitalize text-ink-2", className)}>{children}</span>;
}
/** Row actions popover (native details; no JS). */
export function RowActions({ children, label = "Actions" }: { children: ReactNode; label?: string }) {
  return (
    <details className="relative inline-block [&[open]>summary]:bg-surface-2">
      <summary aria-label={label} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-[var(--r-sm)] border border-line text-muted hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </summary>
      <div className="absolute end-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface py-1 text-[13px] shadow-[var(--shadow-lg)] [&>a]:block [&>a]:px-3 [&>a]:py-2 [&>a:hover]:bg-surface-2 [&>button]:block [&>button]:w-full [&>button]:px-3 [&>button]:py-2 [&>button]:text-start [&>button:hover]:bg-surface-2 [&>form>button]:block [&>form>button]:w-full [&>form>button]:px-3 [&>form>button]:py-2 [&>form>button]:text-start [&>form>button:hover]:bg-surface-2">
        {children}
      </div>
    </details>
  );
}

/* ---------------------------------------------------------------- filters */
export function FilterBar({ children, action = "", resetHref, submitLabel = "Apply" }: { children: ReactNode; action?: string; resetHref?: string; submitLabel?: string }) {
  return (
    <form method="get" action={action} className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      <button type="submit" className="adm-btn-primary">
        {submitLabel}
      </button>
      {resetHref && (
        <Link href={resetHref} className="adm-btn-reset">
          Reset filters
        </Link>
      )}
    </form>
  );
}
/** "Label: Value" select, like the reference. */
export function FilterSelect({ label, name, value, options, allLabel = "All" }: { label: string; name: string; value?: string; options: Array<{ value: string; label: string }>; allLabel?: string | null }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="pointer-events-none absolute start-2.5 text-[13px] text-muted">{label}:</span>
      <select name={name} defaultValue={value ?? ""} className="adm-control" style={{ paddingInlineStart: `${label.length * 7.2 + 18}px` }}>
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
/** Prefix a native select/input with "Label:" (reference style). Children must carry className="adm-control". */
export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="adm-labeled" style={{ ["--lbl" as string]: `${Math.round(label.length * 7.9 + 20)}px` }}>
      <span>{label}:</span>
      {children}
    </label>
  );
}
export function SearchInput({ name = "q", value, placeholder = "Search…", className }: { name?: string; value?: string; placeholder?: string; className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <Search className="pointer-events-none absolute start-2.5 h-4 w-4 text-muted-2" aria-hidden />
      <input type="search" name={name} defaultValue={value} placeholder={placeholder} className="adm-control adm-search w-[220px]" />
    </span>
  );
}
export function FilterCheck({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="adm-check">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} /> {label}
    </label>
  );
}

/* ---------------------------------------------------------------- pagination & tabs */
export function AdminPagination({ page, totalPages, makeHref, total, pageSize }: { page: number; totalPages: number; makeHref: (p: number) => string; total?: number; pageSize?: number }) {
  if (totalPages <= 1 && total === undefined) return null;
  const set = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const list = [...set].sort((a, b) => a - b);
  const cell = "flex h-9 min-w-[36px] items-center justify-center px-2.5 text-[13px] font-medium border-s border-line";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-[12px] text-muted num">
        {total !== undefined && pageSize ? `Showing ${Math.min(total, (page - 1) * pageSize + 1)}–${Math.min(total, page * pageSize)} of ${total}` : `Page ${page} of ${totalPages}`}
      </span>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="inline-flex overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface shadow-[var(--shadow-xs)]">
          {page > 1 ? (
            <Link href={makeHref(page - 1)} className={`${cell} gap-1 border-s-0 text-ink-2 hover:bg-surface-2`}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
            </Link>
          ) : (
            <span className={`${cell} gap-1 border-s-0 text-muted-2`}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
            </span>
          )}
          {list.map((p, i) => (
            <span key={p} className="contents">
              {i > 0 && list[i - 1] !== p - 1 && <span className={`${cell} text-muted-2`}>…</span>}
              {p === page ? (
                <span aria-current="page" className={`${cell} bg-brand-50 text-brand-900 num`}>{p}</span>
              ) : (
                <Link href={makeHref(p)} className={`${cell} text-ink-2 num hover:bg-surface-2`}>{p}</Link>
              )}
            </span>
          ))}
          {page < totalPages ? (
            <Link href={makeHref(page + 1)} className={`${cell} gap-1 text-ink-2 hover:bg-surface-2`}>
              Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : (
            <span className={`${cell} gap-1 text-muted-2`}>
              Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
export function Tabs({ items, current }: { items: Array<{ value: string; label: string; href: string; count?: number }>; current: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--r-sm)] border border-line bg-surface p-1 shadow-[var(--shadow-xs)] w-fit">
      {items.map((it) => {
        const active = it.value === current;
        return (
          <Link key={it.value} href={it.href} aria-current={active ? "page" : undefined} className={cn("inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium", active ? "bg-brand-900 text-white" : "text-ink-2 hover:bg-surface-2")}>
            {it.label}
            {typeof it.count === "number" && <span className={cn("rounded-full px-1.5 text-[11px] num", active ? "bg-white/20" : "bg-surface-2 text-muted")}>{it.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- details & forms */
export function DescriptionList({ items, columns = 2, className }: { items: Array<{ label: ReactNode; value: ReactNode; wide?: boolean }>; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("min-w-0 border-b border-line pb-2.5 last:border-b-0", it.wide && "sm:col-span-full")}>
          <dt className="text-[12px] font-medium text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-[14px] text-ink">{it.value ?? <span className="text-muted-2">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
export function FormSection({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-4 border-b border-line py-6 first:pt-0 last:border-b-0 md:grid-cols-[220px_1fr]", className)}>
      <div>
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
export function FormFooter({ children }: { children: ReactNode }) {
  return <div className="adm-footer">{children}</div>;
}
/** Small key/value line for headers. */
export function Meta({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-[13px] text-muted">{children}</span>;
}
