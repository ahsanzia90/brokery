import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { listVerifications, VERIFICATION_STATUSES } from "@/lib/admin/verifications-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, Labeled, SearchInput, Table, Td, Th } from "@/components/admin/ui";
import { Badge, verificationTone } from "@/components/ui/badge";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
const tone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : s === "more_info_requested" ? "warning" : s === "under_review" ? "info" : "accent");

export default async function VerificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("verification.review");
  const sp = await searchParams;
  const f = { status: str(sp, "status"), q: str(sp, "q"), page: int(sp, "page") };
  const res = await listVerifications(f);
  return (
    <div>
      <AdminPageHeader title="Supplier verification" description="Review submitted business details and documents. Approvals change the public verification label; every decision records the reviewer and reason." actions={<Link href="/admin/businesses" className="rounded-[8px] border border-line px-3 py-2 text-sm font-semibold">All businesses</Link>} />
      <FilterBar resetHref="/admin/verifications">
        <SearchInput value={f.q} placeholder="Business name" />
        <Labeled label="Status"><select name="status" defaultValue={f.status} className="adm-control">
          <option value="">Any status</option>
          {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select></Labeled>
      </FilterBar>
      <Table>
        <thead><tr><Th>Business</Th><Th>Owner</Th><Th>Requested</Th><Th>Current label</Th><Th>Docs</Th><Th>Status</Th><Th>Submitted</Th></tr></thead>
        <tbody>
          {res.rows.length ? res.rows.map(({ v, b, owner, docs }) => (
            <tr key={v.id}>
              <Td><Link href={`/admin/verifications/${v.id}`} className="font-semibold adm-link">{b.name}</Link></Td>
              <Td>{owner.name}</Td>
              <Td>{v.requestedLevel.replace(/_/g, " ")}</Td>
              <Td><Badge tone={verificationTone(b.verificationLevel)}>{b.verificationLevel.replace(/_/g, " ")}</Badge></Td>
              <Td className="num">{Number(docs)}</Td>
              <Td><Badge tone={tone(v.status)}>{v.status.replace(/_/g, " ")}</Badge></Td>
              <Td className="num">{formatDate(v.createdAt)}</Td>
            </tr>
          )) : <EmptyRow colSpan={7}>No verification requests{f.status ? ` with status ${f.status}` : ""}.</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/verifications", { ...f, page: p })} />
    </div>
  );
}
