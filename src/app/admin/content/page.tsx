import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, AdminPagination, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { SearchParams } from "@/lib/admin/params";
import { int, qs, str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

const KINDS = ["page", "guide", "article", "announcement", "faq"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

export default async function ContentListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("content.manage");
  const sp = await searchParams;
  const kind = (KINDS as readonly string[]).includes(str(sp, "kind")) ? (str(sp, "kind") as (typeof KINDS)[number]) : undefined;
  const status = (STATUSES as readonly string[]).includes(str(sp, "status")) ? (str(sp, "status") as (typeof STATUSES)[number]) : undefined;
  const page = int(sp, "page");
  const pageSize = 30;
  const where = and(kind ? eq(contentPages.kind, kind) : undefined, status ? eq(contentPages.status, status) : undefined);
  const [{ n: total }] = await db.select({ n: count() }).from(contentPages).where(where);
  const rows = await db.select().from(contentPages).where(where).orderBy(desc(contentPages.updatedAt)).limit(pageSize).offset((page - 1) * pageSize);
  const publicPath = (r: typeof rows[number]) => (r.kind === "page" ? `/${r.slug}` : r.kind === "guide" || r.kind === "article" ? `/guides/${r.slug}` : null);
  return (
    <div>
      <AdminPageHeader title="Pages & guides" description="Static pages, market guides, announcements and FAQs. Markdown with live preview; Urdu bodies are optional." actions={<><Link href="/admin/content/new?kind=guide" className={buttonClass("primary", "sm")}>+ New guide</Link><Link href="/admin/content/new?kind=page" className={buttonClass("outline", "sm")}>+ New page</Link><Link href="/admin/content/new?kind=announcement" className={buttonClass("outline", "sm")}>+ Announcement</Link></>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <select name="kind" defaultValue={kind ?? ""} className="adm-control">
          <option value="">all kinds</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="adm-control">
          <option value="">all statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className={buttonClass("outline", "sm")}>Filter</button>
      </form>
      <Table>
        <thead>
          <tr><Th>Title</Th><Th>Kind</Th><Th>Slug</Th><Th>Status</Th><Th>Updated</Th><Th></Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No content matches.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.isSystem && <span title="System page">🔒 </span>}{r.titleEn}{r.titleUr && <span className="ms-1 text-muted" lang="ur">({r.titleUr})</span>}</Td>
              <Td><Badge tone="info">{r.kind}</Badge></Td>
              <Td><code className="text-xs">{r.slug}</code></Td>
              <Td><Badge tone={r.status === "published" ? "success" : r.status === "draft" ? "warning" : "neutral"}>{r.status}</Badge>{r.scheduledFor && r.status === "draft" && <span className="block text-xs text-muted">scheduled {formatDateTime(r.scheduledFor)}</span>}</Td>
              <Td className="num text-sm">{formatDateTime(r.updatedAt)}</Td>
              <Td className="whitespace-nowrap"><Link href={`/admin/content/${r.id}/edit`} className="adm-link">Edit</Link>{publicPath(r) && r.status === "published" && <> · <Link href={publicPath(r)!} target="_blank" className="adm-link">View ↗</Link></>}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdminPagination page={page} totalPages={Math.ceil(total / pageSize)} makeHref={(p) => qs("/admin/content", { kind, status, page: p })} />
    </div>
  );
}
