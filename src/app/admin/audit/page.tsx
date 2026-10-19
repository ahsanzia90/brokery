import { requireAdminPage } from "@/lib/authz/guards";
import { listAuditLogs } from "@/lib/admin/audit-service";
import { listAdminUsers } from "@/lib/admin/users-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { JsonDetails } from "@/components/admin/json-details";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("audit.view");
  const sp = await searchParams;
  const f = { actor: str(sp, "actor"), action: str(sp, "action"), entityType: str(sp, "entityType"), entityId: str(sp, "entityId"), from: str(sp, "from"), to: str(sp, "to"), page: int(sp, "page") };
  const [res, admins] = await Promise.all([listAuditLogs(f), listAdminUsers()]);
  const sel = "rounded border border-border-strong p-2 text-sm";
  return (
    <div>
      <AdminPageHeader title="Audit logs" description="Every administrative action with actor, affected record, timestamp and before/after values. Sensitive fields are redacted at write time." />
      <FilterBar>
        <select name="actor" defaultValue={f.actor} className={sel}><option value="">Any actor</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.name || a.phone}</option>)}</select>
        <input name="action" defaultValue={f.action} placeholder="Action prefix e.g. listing." className={sel} />
        <input name="entityType" defaultValue={f.entityType} placeholder="Entity type" className={sel} />
        <input name="entityId" defaultValue={f.entityId} placeholder="Entity id" className={`${sel} w-[300px]`} />
        <input type="date" name="from" defaultValue={f.from} className={sel} />
        <input type="date" name="to" defaultValue={f.to} className={sel} />
        <button type="submit" className="rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </FilterBar>
      <p className="mb-2 text-sm text-text-muted num">{res.total} entries</p>
      <Table>
        <thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>Reason</Th><Th>Before</Th><Th>After</Th></tr></thead>
        <tbody>
          {res.rows.length ? res.rows.map(({ a, actor }) => (
            <tr key={a.id}>
              <Td className="num whitespace-nowrap">{formatDateTime(a.createdAt)}</Td>
              <Td>{actor?.name ?? "system"}</Td>
              <Td className="font-mono text-xs">{a.action}</Td>
              <Td>{a.entityType} <span className="font-mono text-xs text-text-muted">{a.entityId?.slice(0, 8)}</span></Td>
              <Td className="max-w-[240px]">{a.reason ?? "—"}</Td>
              <Td><JsonDetails label="before" value={a.before} /></Td>
              <Td><JsonDetails label="after" value={a.after} /></Td>
            </tr>
          )) : <EmptyRow colSpan={7}>No audit entries match.</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/audit", { ...f, page: p })} />
    </div>
  );
}
