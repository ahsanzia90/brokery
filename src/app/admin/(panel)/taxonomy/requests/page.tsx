import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, profiles, taxonomyRequests } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, AdminPagination, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { SearchParams } from "@/lib/admin/params";
import { int, qs, str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

const STATUSES = ["pending", "approved", "rejected", "merged"] as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(str(sp, "status")) ? (str(sp, "status") as (typeof STATUSES)[number]) : "pending";
  const page = int(sp, "page");
  const pageSize = 25;
  const where = eq(taxonomyRequests.status, status);
  const [{ n: total }] = await db.select({ n: count() }).from(taxonomyRequests).where(where);
  const rows = await db
    .select({ r: taxonomyRequests, commodity: commodities, category: categories, requester: profiles })
    .from(taxonomyRequests)
    .leftJoin(commodities, eq(commodities.id, taxonomyRequests.commodityId))
    .leftJoin(categories, eq(categories.id, taxonomyRequests.categoryId))
    .leftJoin(profiles, eq(profiles.id, taxonomyRequests.requestedBy))
    .where(where)
    .orderBy(desc(taxonomyRequests.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return (
    <div>
      <AdminPageHeader title="Taxonomy requests" description="“Not listed” submissions from sellers and buyers: new commodities, varieties, grades, aliases. Approving creates the entry immediately — no code change needed." breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Requests" }]} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={qs("/admin/taxonomy/requests", { status: s })} className={buttonClass(s === status ? "primary" : "outline", "sm")}>
            {s}
          </Link>
        ))}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Submitted</Th>
            <Th>Type</Th>
            <Th>Proposed</Th>
            <Th>Context</Th>
            <Th>By</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No {status} requests.</EmptyRow>}
          {rows.map(({ r, commodity, category, requester }) => (
            <tr key={r.id}>
              <Td className="num text-sm">{formatDateTime(r.createdAt)}</Td>
              <Td><Badge tone="info">{r.requestType}</Badge></Td>
              <Td>
                <strong>{r.proposedName}</strong>
                {r.proposedNameUr && <span className="ms-1 text-muted" lang="ur">({r.proposedNameUr})</span>}
                {r.region && <span className="block text-xs text-muted">region: {r.region}</span>}
              </Td>
              <Td className="text-sm">
                {commodity ? `Commodity: ${commodity.nameEn}` : category ? `Category: ${category.nameEn}` : "—"}
                {r.notes && <span className="block text-xs text-muted">{r.notes}</span>}
              </Td>
              <Td className="text-sm">{requester?.name || (requester ? "User" : "Guest")}</Td>
              <Td><Link href={`/admin/taxonomy/requests/${r.id}`} className="adm-link">Review</Link></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdminPagination page={page} totalPages={Math.ceil(total / pageSize)} makeHref={(p) => qs("/admin/taxonomy/requests", { status, page: p })} />
    </div>
  );
}
