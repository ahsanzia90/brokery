import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, homeLabel = "Home" }: { items: Crumb[]; homeLabel?: string }) {
  const all: Crumb[] = [{ label: homeLabel, href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mb-4 overflow-x-auto text-sm text-text-muted">
      <ol className="flex items-center gap-1.5 whitespace-nowrap">
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-primary underline-offset-2 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined} className={i === all.length - 1 ? "text-text" : ""}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
