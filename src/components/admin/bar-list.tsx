export function BarList({ items, emptyText = "No data in this range." }: { items: Array<{ label: string; n: number; href?: string }>; emptyText?: string }) {
  if (!items.length) return <p className="py-2 text-[13px] text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,150px)_1fr_44px] items-center gap-3 text-[13px]">
          <span className="truncate text-ink-2" title={i.label}>
            {i.label}
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-brand-50">
            <span className="block h-full rounded-full bg-brand-800" style={{ width: `${Math.max(1.5, (i.n / max) * 100)}%` }} />
          </span>
          <span className="text-end font-semibold text-ink num">{i.n}</span>
        </li>
      ))}
    </ul>
  );
}
