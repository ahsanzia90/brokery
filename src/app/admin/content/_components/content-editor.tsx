"use client";
import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/content/markdown";

/** Markdown textarea with a live preview (client-side, same renderer as the public site). */
export function MarkdownEditor({ name, label, initial, dir }: { name: string; label: string; initial: string; dir?: "rtl" | "ltr" }) {
  const [value, setValue] = useState(initial);
  const [html, setHtml] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setHtml(renderMarkdown(value)), 200);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <label className="block">
        <span className="block text-sm font-semibold">{label} (Markdown)</span>
        <textarea name={name} value={value} onChange={(e) => setValue(e.target.value)} dir={dir} rows={22} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong bg-surface px-3 py-2 font-mono text-sm" />
      </label>
      <div>
        <span className="block text-sm font-semibold">Preview</span>
        <div dir={dir} className="prose-simple mt-1 max-h-[560px] min-h-[200px] overflow-auto rounded-[var(--radius)] border border-border bg-surface p-4" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

type Item = { id: string; nameEn: string; nameUr: string | null; categoryName: string };

/** Searchable multi-select for related commodities. Submits hidden inputs named `name`. */
export function CommodityMultiSelect({ name, initial }: { name: string; initial: Item[] }) {
  const [selected, setSelected] = useState<Item[]>(initial);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/admin/content/api/commodities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items: Item[] };
        setResults(data.items.filter((i) => !selected.some((s) => s.id === i.id)));
      } catch {}
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, selected]);
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-2">
        {selected.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm">
            <input type="hidden" name={name} value={s.id} />
            {s.nameEn}
            <button type="button" onClick={() => setSelected((x) => x.filter((y) => y.id !== s.id))} className="text-danger" aria-label={`Remove ${s.nameEn}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commodities to link…" className="min-h-[44px] w-full rounded-[var(--radius)] border border-border-strong px-3" />
      {results.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-[var(--radius)] border border-border bg-surface">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-start text-sm hover:bg-surface-muted"
                onClick={() => {
                  setSelected((x) => [...x, r]);
                  setQ("");
                }}
              >
                {r.nameEn} <span className="text-text-muted">· {r.categoryName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
