import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Segmented pagination (like the reference): prev · numbered · next, with ellipsis. */
export function Pagination({ page, totalPages, hrefFor, labels }: { page: number; totalPages: number; hrefFor: (p: number) => string; labels: { prev: string; next: string; page: string } }) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1, page - 2, page + 2].filter((p) => p >= 1 && p <= totalPages));
  const list = [...pages].sort((a, b) => a - b);
  const cell = "flex h-11 min-w-[44px] items-center justify-center px-3 text-[14px] font-medium border-s border-line first:border-s-0";
  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <div className="inline-flex overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface shadow-[var(--shadow-xs)]">
        {page > 1 ? (
          <Link rel="prev" href={hrefFor(page - 1)} className={`${cell} gap-1 text-ink-2 hover:bg-surface-2`}>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> <span className="hidden sm:inline">{labels.prev}</span>
          </Link>
        ) : (
          <span className={`${cell} gap-1 text-muted-2`}><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> <span className="hidden sm:inline">{labels.prev}</span></span>
        )}
        {list.map((p, i) => (
          <span key={p} className="contents">
            {i > 0 && list[i - 1] !== p - 1 && <span className={`${cell} text-muted-2`}>…</span>}
            {p === page ? (
              <span aria-current="page" className={`${cell} bg-brand-50 text-brand-900 num`}>{p}</span>
            ) : (
              <Link href={hrefFor(p)} className={`${cell} text-ink-2 num hover:bg-surface-2`}>{p}</Link>
            )}
          </span>
        ))}
        {page < totalPages ? (
          <Link rel="next" href={hrefFor(page + 1)} className={`${cell} gap-1 text-ink-2 hover:bg-surface-2`}>
            <span className="hidden sm:inline">{labels.next}</span> <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        ) : (
          <span className={`${cell} gap-1 text-muted-2`}><span className="hidden sm:inline">{labels.next}</span> <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></span>
        )}
      </div>
    </nav>
  );
}
