export function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-text-muted">—</span>;
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary">{label}</summary>
      <pre className="mt-1 max-w-[420px] overflow-auto rounded bg-surface-muted p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
