"use client";
import { useEffect, useState } from "react";

/** Builds an in-page table of contents from the h2 headings inside `articleId`. */
export function ArticleToc({ articleId, label }: { articleId: string; label: string }) {
  const [items, setItems] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const root = document.getElementById(articleId);
    if (!root) return;
    const hs = Array.from(root.querySelectorAll("h2, h3"));
    const list = hs.map((h, i) => {
      if (!h.id) h.id = `s-${i + 1}-${(h.textContent ?? "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`;
      return { id: h.id, text: h.textContent ?? "", level: h.tagName === "H3" ? 3 : 2 };
    });
    setItems(list);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [articleId]);
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="text-[14px]">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <ul className="space-y-1 border-s border-line">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={`-ms-px block border-s-2 py-1 leading-snug ${it.level === 3 ? "ps-6 text-[13px]" : "ps-3"} ${active === it.id ? "border-brand-800 font-semibold text-brand-900" : "border-transparent text-muted hover:text-ink"}`}>
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
