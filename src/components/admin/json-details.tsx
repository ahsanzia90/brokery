export function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-2">—</span>;
  return (
    <details>
      <summary className="cursor-pointer text-[12px] font-medium text-brand-800 hover:underline">{label}</summary>
      <pre className="mt-1 max-w-[440px] overflow-auto rounded-[var(--r-sm)] border border-line bg-surface-2 p-2 text-[11px] leading-relaxed text-ink-2">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
