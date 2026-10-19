import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { listUsers } from "@/lib/admin/users-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/authz/permissions";
import { formatDate } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("users.view");
  const sp = await searchParams;
  const f = { q: str(sp, "q"), status: str(sp, "status"), role: str(sp, "role"), seller: str(sp, "seller"), reported: str(sp, "reported"), page: int(sp, "page") };
  const res = await listUsers(f);
  const sel = "rounded border border-border-strong p-2 text-sm";
  return (
    <div>
      <AdminPageHeader title="Users & roles" description="Search accounts, review activity, assign roles, suspend or reactivate." />
      <FilterBar>
        <input name="q" defaultValue={f.q} placeholder="Name, phone or email" className={sel} />
        <select name="status" defaultValue={f.status} className={sel}>
          <option value="">Any status</option>
          {["active", "suspended", "deactivated", "deleted"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="role" defaultValue={f.role} className={sel}>
          <option value="">Any role</option>
          {(["buyer", "seller", ...ADMIN_ROLES] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <label className="text-sm"><input type="checkbox" name="seller" value="1" defaultChecked={f.seller === "1"} /> Sellers only</label>
        <label className="text-sm"><input type="checkbox" name="reported" value="1" defaultChecked={f.reported === "1"} /> Reported accounts</label>
        <button type="submit" className="rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </FilterBar>
      <p className="mb-2 text-sm text-text-muted num">{res.total} users</p>
      <Table>
        <thead>
          <tr><Th>Name</Th><Th>Phone</Th><Th>Roles</Th><Th>Status</Th><Th>Joined</Th><Th>Last active</Th></tr>
        </thead>
        <tbody>
          {res.rows.length ? res.rows.map(({ u, roles }) => (
            <tr key={u.id}>
              <Td><Link href={`/admin/users/${u.id}`} className="font-semibold text-primary hover:underline">{u.name || "(no name)"}</Link>{u.isSeller && <span className="ms-2 text-xs text-text-muted">seller</span>}</Td>
              <Td className="num">{formatPhoneDisplay(u.phone)}</Td>
              <Td>{roles.filter((r) => r !== "buyer").map((r) => <Badge key={r} tone={ADMIN_ROLES.includes(r as never) ? "accent" : "neutral"} className="me-1">{ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}</Badge>)}</Td>
              <Td><Badge tone={u.status === "active" ? "success" : u.status === "suspended" ? "danger" : "neutral"}>{u.status}</Badge></Td>
              <Td className="num">{formatDate(u.createdAt)}</Td>
              <Td className="num">{formatDate(u.lastActiveAt)}</Td>
            </tr>
          )) : <EmptyRow colSpan={6}>No users match these filters.</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/users", { ...f, page: p })} />
    </div>
  );
}
