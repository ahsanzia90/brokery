export function BarList({ items, emptyText = "No data in this range." }: { items: Array<{ label: string; n: number }>; emptyText?: string }) {
  if (!items.length) return <p className="text-sm text-text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[140px_1fr_48px] items-center gap-2 text-sm">
          <span className="truncate" title={i.label}>
            {i.label}
          </span>
          <span className="h-3 rounded bg-surface-muted">
            <span className="block h-3 rounded bg-primary" style={{ width: `${Math.max(2, (i.n / max) * 100)}%` }} />
          </span>
          <span className="text-end num">{i.n}</span>
        </li>
      ))}
    </ul>
  );
}
