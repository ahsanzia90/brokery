"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

type Suggestion = { type: "commodity" | "category" | "supplier" | "location" | "recent" | "popular"; label: string; sub?: string; href: string };

export function SearchBar({ size = "md", autoFocus, initialQuery = "", placeholder }: { size?: "md" | "lg"; autoFocus?: boolean; initialQuery?: string; placeholder?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        let recent: string[] = [];
        try {
          recent = JSON.parse(localStorage.getItem("ml_recent_searches") ?? "[]");
        } catch {}
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}&lang=${locale}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: Suggestion[] };
        const recentItems: Suggestion[] = term ? [] : recent.slice(0, 5).map((r) => ({ type: "recent", label: r, href: `/search?q=${encodeURIComponent(r)}` }));
        setItems([...recentItems, ...data.suggestions]);
      } catch {}
    }, term ? 150 : 0);
    return () => clearTimeout(timer);
  }, [q, locale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function remember(term: string) {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem("ml_recent_searches") ?? "[]");
      localStorage.setItem("ml_recent_searches", JSON.stringify([term, ...prev.filter((p) => p !== term)].slice(0, 8)));
    } catch {}
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    remember(term);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const inputCls = size === "lg" ? "min-h-[60px] text-lg ps-4 pe-32" : "min-h-[48px] text-base ps-3.5 pe-24";

  return (
    <div ref={wrapRef} className="relative w-full">
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t("home.search.label")}
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={q}
          placeholder={placeholder ?? t("home.search.placeholder")}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              remember(items[active].label);
              router.push(items[active].href);
              setOpen(false);
            } else if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={`block w-full rounded-[var(--radius)] border border-border-strong bg-surface text-text shadow-sm placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${inputCls}`}
        />
        <button type="submit" className={`absolute inset-y-1.5 end-1.5 rounded-[8px] bg-primary px-4 font-semibold text-white hover:bg-primary-strong ${size === "lg" ? "text-base" : "text-sm"}`}>
          {t("home.search.button")}
        </button>
      </form>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-[var(--radius)] border border-border bg-surface shadow-md">
          {items.map((it, i) => (
            <li
              key={`${it.type}-${it.href}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                remember(it.label);
                router.push(it.href);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3 ${i === active ? "bg-primary-soft" : "hover:bg-surface-muted"}`}
            >
              <span>
                <span className="font-medium">{it.label}</span>
                {it.sub && <span className="ms-2 text-sm text-text-muted">{it.sub}</span>}
              </span>
              <span className="text-xs uppercase tracking-wide text-text-muted">{t(`search.${it.type === "recent" ? "recent" : it.type === "popular" ? "popular" : it.type === "location" ? "inCity" : it.type === "supplier" ? "suppliers" : it.type === "category" ? "categories" : "commodities"}`).replace("{city}", "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
