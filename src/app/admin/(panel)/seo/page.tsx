import Link from "next/link";
import { count, desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { seoMetadata } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { AdminPageHeader, AdminPagination, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { SeoForm } from "./_components/seo-form";
import { saveSeoAction } from "./actions";
import type { SearchParams } from "@/lib/admin/params";
import { int, qs, str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

export default async function SeoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("seo.manage");
  const sp = await searchParams;
  const q = str(sp, "q");
  const page = int(sp, "page");
  const pageSize = 30;
  const where = q ? or(ilike(seoMetadata.path, `%${q}%`), ilike(seoMetadata.title, `%${q}%`), ilike(seoMetadata.entityType, `%${q}%`)) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(seoMetadata).where(where);
  const rows = await db.select().from(seoMetadata).where(where).orderBy(desc(seoMetadata.updatedAt)).limit(pageSize).offset((page - 1) * pageSize);
  return (
    <div>
      <AdminPageHeader title="SEO metadata" description="Overrides for titles, descriptions, canonical URLs, robots directives and social sharing. Pages without an override use their generated defaults." actions={<><Link href="/admin/seo/redirects" className={buttonClass("outline", "sm")}>Redirects</Link><Link href="/admin/seo/sitemap" className={buttonClass("outline", "sm")}>Sitemap inspection</Link></>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search path, title, entity type…" className="min-h-[44px] w-80 max-w-full rounded-[var(--radius)] border border-line-strong px-3" />
        <button className={buttonClass("outline", "sm")}>Search</button>
      </form>
      <Table>
        <thead><tr><Th>Target</Th><Th>Title</Th><Th>Robots</Th><Th>Sitemap</Th><Th>Updated</Th><Th></Th></tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No overrides yet. Add one below.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.path ? <code className="text-xs">{r.path}</code> : <span className="text-sm">{r.entityType} <code className="text-xs">{r.entityId?.slice(0, 8)}…</code></span>}</Td>
              <Td className="text-sm">{r.title ?? <span className="text-muted">default</span>}</Td>
              <Td>{r.robots ? <Badge tone={r.robots.includes("noindex") ? "warning" : "success"}>{r.robots}</Badge> : <span className="text-muted text-sm">default</span>}</Td>
              <Td className="text-sm">{r.includeInSitemap === null ? "by rules" : r.includeInSitemap ? "yes" : <Badge tone="warning">excluded</Badge>}</Td>
              <Td className="num text-sm">{formatDateTime(r.updatedAt)}</Td>
              <Td><Link href={`/admin/seo/${r.id}`} className="adm-link">Edit</Link></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdminPagination page={page} totalPages={Math.ceil(total / pageSize)} makeHref={(p) => qs("/admin/seo", { q, page: p })} />
      <h2 className="adm-section">Add override</h2>
      <SeoForm action={saveSeoAction} siteUrl={BRAND_DEFAULTS.siteUrl} />
    </div>
  );
}
