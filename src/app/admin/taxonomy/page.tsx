import Link from "next/link";
import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, listings } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, Chip, FilterBar, Panel, RowActions, SearchInput } from "@/components/admin/ui";
import { ChevronRight } from "lucide-react";
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
      <FilterBar resetHref="/admin/taxonomy">
        <SearchInput value={str(sp, "q")} placeholder="Filter categories…" />
      </FilterBar>
      <Panel padded={false} className="overflow-hidden [&>div>details:last-child>summary]:border-b-0">
        <div>
          {roots.filter(matches).map((c) => (
            <CategoryNode key={c.id} c={c} depth={0} openAll={Boolean(q)} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CategoryNode({ c, depth, openAll }: { c: Cat; depth: number; openAll: boolean }) {
  const inactive = c.status !== "active";
  return (
    <div className="relative">
    <details id={`cat-${c.id}`} open={openAll || depth === 0} className="group/cat">
      <summary className="flex cursor-pointer list-none items-center gap-3 border-b border-line py-2.5 pe-16 ps-4 hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-2 transition-transform group-open/cat:rotate-90" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`text-[14px] font-semibold ${inactive ? "text-muted line-through" : "text-ink"}`}>{c.nameEn}</span>
          {c.nameUr && <span className="text-[13px] text-muted" lang="ur" dir="rtl">{c.nameUr}</span>}
          <span className="adm-kbd">/{c.slug}</span>
          <Badge tone={inactive ? "neutral" : "success"}>{c.status}</Badge>
          {c.listingKind !== "commodity" && <Chip>{c.listingKind.replace(/_/g, " ")}</Chip>}
          {c.moderationLevel !== "review" && <Badge tone={c.moderationLevel === "restricted" ? "warning" : c.moderationLevel === "prohibited" ? "danger" : "info"}>{c.moderationLevel}</Badge>}
        </span>
        <span className="hidden shrink-0 text-[12px] text-muted num sm:block">
          {c.children.length} sub · {c.commodityCount} commodities · {c.listingCount} listings
        </span>
      </summary>
      <div className="adm-tree border-b border-line bg-surface-2/40 py-2 ps-6">
        {(c.commodityCount > 0 || c.children.length === 0) && (
          <div className="px-4 py-1.5">
            <CommodityList categoryId={c.id} />
          </div>
        )}
        {c.children.length > 0 && (
          <ul className="mt-1 bg-surface">
            {c.children.map((ch) => (
              <li key={ch.id}>
                <CategoryNode c={ch} depth={depth + 1} openAll={openAll} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
    <div className="absolute end-4 top-1.5">
          <RowActions label={`Actions for ${c.nameEn}`}>
            <Link href={`/admin/taxonomy/categories/${c.id}/edit`}>Edit</Link>
            <Link href={`/admin/taxonomy/categories/new?parent=${c.id}`}>Add subcategory</Link>
            <Link href={`/admin/taxonomy/commodities/new?category=${c.id}`}>Add commodity</Link>
            <form action={reorderCategoryAction}>
              <input type="hidden" name="id" value={c.id} />
              <button name="direction" value="up">Move up</button>
            </form>
            <form action={reorderCategoryAction}>
              <input type="hidden" name="id" value={c.id} />
              <button name="direction" value="down">Move down</button>
            </form>
            <Link href={`/admin/taxonomy/categories/${c.id}/confirm?action=${inactive ? "active" : "inactive"}`}>{inactive ? "Reactivate" : "Deactivate"}</Link>
            <Link href={`/admin/taxonomy/categories/${c.id}/confirm?action=merge`} className="text-danger">Merge into…</Link>
          </RowActions>
    </div>
    </div>
  );
}

async function CommodityList({ categoryId }: { categoryId: string }) {
  const rows = await db
    .select({ id: commodities.id, nameEn: commodities.nameEn, nameUr: commodities.nameUr, slug: commodities.slug, status: commodities.status, isPopular: commodities.isPopular, moderationLevel: commodities.moderationLevel })
    .from(commodities)
    .where(eq(commodities.categoryId, categoryId))
    .orderBy(asc(commodities.sortOrder), asc(commodities.nameEn));
  if (!rows.length) return <p className="text-[12px] text-muted-2">No commodities directly in this category.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/taxonomy/commodities/${r.id}/edit`} className={`inline-flex h-7 items-center gap-1 rounded-full border bg-surface px-2.5 text-[12px] font-medium hover:border-brand-700 hover:text-brand-900 ${r.status !== "active" ? "border-line text-muted line-through" : "border-line text-ink-2"}`}>
            {r.nameEn}
            {r.nameUr && <span className="text-muted" lang="ur">({r.nameUr})</span>}
            {r.isPopular && <span title="Popular">★</span>}
            {r.moderationLevel && <span className="text-xs text-warning">{r.moderationLevel}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
