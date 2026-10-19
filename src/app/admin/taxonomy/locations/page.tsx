import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

type Loc = typeof locations.$inferSelect & { children: Loc[]; listingCount: number; businessCount: number };

export default async function LocationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  const q = str(sp, "q").toLowerCase();
  const rows = await db
    .select({
      l: locations,
      listingCount: sql<number>`(SELECT count(*) FROM listings x WHERE x.status = 'published' AND (x.city_id = ${locations.id} OR x.market_id = ${locations.id} OR x.province_id = ${locations.id}))`,
      businessCount: sql<number>`(SELECT count(*) FROM businesses b WHERE b.status = 'active' AND (b.city_id = ${locations.id} OR b.market_id = ${locations.id} OR b.province_id = ${locations.id}))`,
    })
    .from(locations)
    .orderBy(asc(locations.sortOrder), asc(locations.nameEn));
  const byId = new Map<string, Loc>(rows.map((r) => [r.l.id, { ...r.l, children: [], listingCount: Number(r.listingCount), businessCount: Number(r.businessCount) }]));
  const roots: Loc[] = [];
  for (const l of byId.values()) {
    if (l.parentId && byId.has(l.parentId)) byId.get(l.parentId)!.children.push(l);
    else roots.push(l);
  }
  const matches = (l: Loc): boolean => !q || l.nameEn.toLowerCase().includes(q) || (l.nameUr ?? "").includes(q) || l.slug.includes(q) || l.children.some(matches);
  return (
    <div>
      <AdminPageHeader title="Locations" description={`${rows.length} locations: country → province → district → city → market. Paths drive /markets/… URLs; renaming a slug updates descendants and adds redirects.`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Locations" }]} actions={<Link href="/admin/taxonomy/locations/new" className={buttonClass("primary", "sm")}>+ New location</Link>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={str(sp, "q")} placeholder="Search locations…" className="min-h-[44px] rounded-[var(--radius)] border border-border-strong px-3" />
        <button className={buttonClass("outline", "sm")}>Search</button>
      </form>
      <div className="space-y-2">
        {roots.filter(matches).map((l) => (
          <Node key={l.id} l={l} depth={0} open={Boolean(q)} filter={matches} />
        ))}
      </div>
    </div>
  );
}

function Node({ l, depth, open, filter }: { l: Loc; depth: number; open: boolean; filter: (l: Loc) => boolean }) {
  const kids = l.children.filter(filter);
  const row = (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-semibold">{l.nameEn}</span>
      {l.nameUr && <span className="text-text-muted" lang="ur" dir="rtl">{l.nameUr}</span>}
      <Badge tone="info">{l.type}</Badge>
      <code className="text-xs text-text-muted">/{l.path}</code>
      {l.isMajorMarket && <Badge tone="accent">major market</Badge>}
      {l.status !== "active" && <Badge tone="neutral">{l.status}</Badge>}
      <span className="text-xs text-text-muted num">{l.businessCount} suppliers · {l.listingCount} listings</span>
      <span className="ms-auto flex gap-1">
        <Link href={`/admin/taxonomy/locations/${l.id}/edit`} className={buttonClass("outline", "sm")}>Edit</Link>
        {l.type !== "market" && <Link href={`/admin/taxonomy/locations/new?parent=${l.id}`} className={buttonClass("ghost", "sm")}>+ Child</Link>}
      </span>
    </span>
  );
  if (!kids.length) return <div className={`card px-4 py-2 ${depth ? "ms-4" : ""}`}>{row}</div>;
  return (
    <details open={open || depth < 1} className={`card ${depth ? "ms-4" : ""}`}>
      <summary className="cursor-pointer px-4 py-2">{row}</summary>
      <div className="space-y-2 border-t border-border p-2">
        {kids.map((k) => (
          <Node key={k.id} l={k} depth={depth + 1} open={open} filter={filter} />
        ))}
      </div>
    </details>
  );
}
