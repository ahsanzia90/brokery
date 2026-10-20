"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

type Suggestion = { type: "commodity" | "category" | "supplier" | "location" | "recent" | "popular"; label: string; sub?: string; href: string };

import { Search } from "lucide-react";

export function SearchBar({ size = "md", autoFocus, initialQuery = "", placeholder }: { size?: "sm" | "md" | "lg"; autoFocus?: boolean; initialQuery?: string; placeholder?: string }) {
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

  const inputCls = size === "lg" ? "h-16 text-[17px] ps-12 pe-32 rounded-[var(--r-md)] shadow-[var(--shadow-md)]" : size === "sm" ? "h-10 text-[14px] ps-10 pe-20 rounded-full" : "h-12 text-[15px] ps-11 pe-24 rounded-[var(--r-sm)]";
  const iconCls = size === "lg" ? "start-4 h-5 w-5" : size === "sm" ? "start-3.5 h-4 w-4" : "start-3.5 h-4.5 w-4.5";

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
          className={`block w-full border border-line-strong bg-surface text-ink placeholder:text-muted-2 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-800/10 ${inputCls}`}
        />
        <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${iconCls}`} aria-hidden />
        <button type="submit" className={`absolute top-1/2 end-1.5 -translate-y-1/2 font-semibold text-white hover:bg-brand-900 ${size === "lg" ? "h-12 rounded-[var(--r-sm)] bg-brand-800 px-5 text-[15px]" : size === "sm" ? "h-7 rounded-full bg-brand-800 px-3 text-[12px]" : "h-9 rounded-[6px] bg-brand-800 px-4 text-[14px]"}`}>
          {t("home.search.button")}
        </button>
      </form>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-[var(--r-md)] border border-line bg-surface p-1.5 shadow-[var(--shadow-lg)]">
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
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--r-sm)] px-3 py-2.5 ${i === active ? "bg-brand-50" : "hover:bg-surface-2"}`}
            >
              <span>
                <span className="text-[15px] font-medium text-ink">{it.label}</span>
                {it.sub && <span className="ms-2 text-[13px] text-muted">{it.sub}</span>}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{t(`search.${it.type === "recent" ? "recent" : it.type === "popular" ? "popular" : it.type === "location" ? "inCity" : it.type === "supplier" ? "suppliers" : it.type === "category" ? "categories" : "commodities"}`).replace("{city}", "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
