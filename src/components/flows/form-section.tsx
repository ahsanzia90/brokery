import type { ReactNode } from "react";

/** Grouped form section: numbered-free, title + helper on the left of a divider, fields below. */
export function FormSection({ title, description, children, first }: { title: ReactNode; description?: ReactNode; children: ReactNode; first?: boolean }) {
  return (
    <section className={first ? "" : "mt-8 border-t border-line pt-8"}>
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 mb-4 max-w-xl text-[14px] text-muted">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

/** Sticky action bar: inline on desktop, pinned above the mobile nav on phones. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[64px] z-30 -mx-4 mt-8 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <div className="flex flex-wrap items-center justify-end gap-3">{children}</div>
    </div>
  );
}

/** Definition list for summaries (review steps, request details). */
export function Facts({ items, columns = 2 }: { items: Array<{ label: ReactNode; value: ReactNode }>; columns?: 1 | 2 | 3 }) {
  const cols = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${cols}`}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{it.label}</dt>
          <dd className="mt-0.5 text-[15px] font-medium text-ink break-words">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
