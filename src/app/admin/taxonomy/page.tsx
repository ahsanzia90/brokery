import Link from "next/link";
import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, listings } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { reorderCategoryAction } from "./actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

type Cat = typeof categories.$inferSelect & { children: Cat[]; commodityCount: number; listingCount: number };

export default async function TaxonomyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  const q = str(sp, "q").toLowerCase();
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  const commodityCounts = await db.select({ categoryId: commodities.categoryId, n: count() }).from(commodities).where(eq(commodities.status, "active")).groupBy(commodities.categoryId);
  const listingCounts = await db
    .select({ categoryId: commodities.categoryId, n: count() })
    .from(listings)
    .innerJoin(commodities, eq(commodities.id, listings.commodityId))
    .where(eq(listings.status, "published"))
    .groupBy(commodities.categoryId);
  const cc = new Map(commodityCounts.map((r) => [r.categoryId, r.n]));
  const lc = new Map(listingCounts.map((r) => [r.categoryId, r.n]));
  const byId = new Map<string, Cat>(rows.map((r) => [r.id, { ...r, children: [], commodityCount: cc.get(r.id) ?? 0, listingCount: lc.get(r.id) ?? 0 }]));
  const roots: Cat[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(c);
    else roots.push(c);
  }
  const matches = (c: Cat): boolean => !q || c.nameEn.toLowerCase().includes(q) || (c.nameUr ?? "").includes(q) || c.slug.includes(q) || c.children.some(matches);
  const [{ n: totalCommodities }] = await db.select({ n: count() }).from(commodities);
  const [{ n: pendingRequests }] = await db.select({ n: count() }).from(sql`taxonomy_requests`).where(sql`status = 'pending'`);

  return (
    <div>
      <AdminPageHeader
        title="Categories & commodities"
        description={`${rows.length} categories · ${totalCommodities} commodities. Renaming keeps IDs, so existing listings are never broken; slug changes add redirects automatically.`}
        actions={
          <>
            <Link href="/admin/taxonomy/categories/new" className={buttonClass("primary", "sm")}>
              + Main category
            </Link>
            <Link href="/admin/taxonomy/requests" className={buttonClass("outline", "sm")}>
              Requests {pendingRequests > 0 && <Badge tone="warning">{pendingRequests}</Badge>}
            </Link>
          </>
        }
      />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={str(sp, "q")} placeholder="Filter categories…" className="min-h-[44px] rounded-[var(--radius)] border border-border-strong px-3" />
        <button className={buttonClass("outline", "sm")}>Filter</button>
      </form>
      <div className="space-y-2">
        {roots.filter(matches).map((c) => (
          <CategoryNode key={c.id} c={c} depth={0} openAll={Boolean(q)} />
        ))}
      </div>
    </div>
  );
}

function CategoryNode({ c, depth, openAll }: { c: Cat; depth: number; openAll: boolean }) {
  const inactive = c.status !== "active";
  return (
    <details id={`cat-${c.id}`} open={openAll || depth === 0} className="card">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
        <span className="font-bold">
          {c.icon ? <span aria-hidden>{c.icon} </span> : null}
          {c.nameEn}
        </span>
        {c.nameUr && <span className="text-text-muted" lang="ur" dir="rtl">{c.nameUr}</span>}
        <code className="text-xs text-text-muted">/{c.slug}</code>
        <Badge tone={inactive ? "neutral" : "success"}>{c.status}</Badge>
        <Badge tone="info">{c.listingKind}</Badge>
        <Badge tone={c.moderationLevel === "restricted" ? "warning" : c.moderationLevel === "prohibited" ? "danger" : "neutral"}>{c.moderationLevel}</Badge>
        <span className="text-sm text-text-muted num">
          {c.children.length} sub · {c.commodityCount} commodities · {c.listingCount} listings
        </span>
        <span className="ms-auto flex flex-wrap gap-1.5">
          <Link href={`/admin/taxonomy/categories/${c.id}/edit`} className={buttonClass("outline", "sm")}>
            Edit
          </Link>
          <Link href={`/admin/taxonomy/categories/new?parent=${c.id}`} className={buttonClass("ghost", "sm")}>
            + Sub
          </Link>
          <Link href={`/admin/taxonomy/commodities/new?category=${c.id}`} className={buttonClass("ghost", "sm")}>
            + Commodity
          </Link>
          <form action={reorderCategoryAction} className="inline-flex gap-1">
            <input type="hidden" name="id" value={c.id} />
            <button name="direction" value="up" className={buttonClass("ghost", "sm")} aria-label={`Move ${c.nameEn} up`}>
              ↑ Up
            </button>
            <button name="direction" value="down" className={buttonClass("ghost", "sm")} aria-label={`Move ${c.nameEn} down`}>
              ↓ Down
            </button>
          </form>
          <Link href={`/admin/taxonomy/categories/${c.id}/confirm?action=${inactive ? "active" : "inactive"}`} className={buttonClass("ghost", "sm")}>
            {inactive ? "Reactivate" : "Deactivate"}
          </Link>
          <Link href={`/admin/taxonomy/categories/${c.id}/confirm?action=merge`} className={buttonClass("ghost", "sm")}>
            Merge…
          </Link>
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3 ps-8">
        <CommodityList categoryId={c.id} />
        {c.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {c.children.map((ch) => (
              <CategoryNode key={ch.id} c={ch} depth={depth + 1} openAll={openAll} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

async function CommodityList({ categoryId }: { categoryId: string }) {
  const rows = await db
    .select({ id: commodities.id, nameEn: commodities.nameEn, nameUr: commodities.nameUr, slug: commodities.slug, status: commodities.status, isPopular: commodities.isPopular, moderationLevel: commodities.moderationLevel })
    .from(commodities)
    .where(eq(commodities.categoryId, categoryId))
    .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn));
  if (!rows.length) return <p className="text-sm text-text-muted">No commodities directly in this category.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/taxonomy/commodities/${r.id}/edit`} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:border-primary ${r.status !== "active" ? "border-border text-text-muted line-through" : "border-border"}`}>
            {r.nameEn}
            {r.nameUr && <span className="text-text-muted" lang="ur">({r.nameUr})</span>}
            {r.isPopular && <span title="Popular">★</span>}
            {r.moderationLevel && <span className="text-xs text-warning">{r.moderationLevel}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
