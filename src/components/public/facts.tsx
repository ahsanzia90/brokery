import type { ReactNode } from "react";

export type Fact = { label: ReactNode; value: ReactNode };

/** Key-facts definition grid: label above value, hairline separators. */
export function FactGrid({ facts, columns = 3 }: { facts: Fact[]; columns?: 2 | 3 | 4 }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-4 ${cols}`}>
      {facts.map((f, i) => (
        <div key={i} className="min-w-0 border-t border-line pt-3">
          <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold text-ink num">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Two-column specification table. */
export function SpecTable({ rows }: { rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="divide-y divide-line rounded-[var(--r-md)] border border-line">
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 text-[14px]">
          <dt className="text-muted">{k}</dt>
          <dd className="font-medium text-ink num">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
