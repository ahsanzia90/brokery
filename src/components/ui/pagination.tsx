import Link from "next/link";
import { buttonClass } from "./button";

export function Pagination({ page, totalPages, hrefFor, labels }: { page: number; totalPages: number; hrefFor: (p: number) => string; labels: { prev: string; next: string; page: string } }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link rel="prev" href={hrefFor(page - 1)} className={buttonClass("outline", "md")}>
          ‹ {labels.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-text-muted num">
        {labels.page} {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link rel="next" href={hrefFor(page + 1)} className={buttonClass("outline", "md")}>
          {labels.next} ›
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
