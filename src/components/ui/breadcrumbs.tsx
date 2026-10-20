import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, homeLabel = "Home" }: { items: Crumb[]; homeLabel?: string }) {
  const all: Crumb[] = [{ label: homeLabel, href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-5 overflow-x-auto text-[13px] text-muted">
      <ol className="flex items-center gap-1 whitespace-nowrap">
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-2 rtl:rotate-180" aria-hidden />}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-brand-800">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined} className={i === all.length - 1 ? "font-medium text-ink" : ""}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
