import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { listRfqs, RFQ_STATUSES } from "@/lib/admin/enquiries-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, Table, Td, Th } from "@/components/admin/ui";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("enquiries.view");
  const sp = await searchParams;
  const f = { q: str(sp, "q"), status: str(sp, "status"), page: int(sp, "page") };
  const res = await listRfqs(f);
  const sel = "rounded border border-border-strong p-2 text-sm";
  return (
    <div>
      <AdminPageHeader title="Buyer enquiries" description="Read-only view of buying requests, matched suppliers and offers. Conversations are never edited; moderation only closes abusive requests with an audit trail." />
      <FilterBar>
        <input name="q" defaultValue={f.q} placeholder="Reference, buyer name/phone, commodity" className={sel} />
        <select name="status" defaultValue={f.status} className={sel}><option value="">Any status</option>{RFQ_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
        <button type="submit" className="rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </FilterBar>
      <p className="mb-2 text-sm text-text-muted num">{res.total} requests</p>
      <Table>
        <thead><tr><Th>Reference</Th><Th>Buyer</Th><Th>Commodity</Th><Th>Quantity</Th><Th>City</Th><Th>Matched</Th><Th>Offers</Th><Th>Status</Th><Th>Created</Th></tr></thead>
        <tbody>
          {res.rows.length ? res.rows.map(({ r, buyer, commodity, unit, city, recipients, quotes }) => (
            <tr key={r.id}>
              <Td><Link href={`/admin/enquiries/${r.id}`} className="font-semibold text-primary hover:underline num">{r.reference}</Link></Td>
              <Td><Link href={`/admin/users/${buyer.id}`} className="hover:underline">{buyer.name}</Link></Td>
              <Td>{commodity.nameEn}</Td>
              <Td className="num">{formatNumber(r.quantity)} {unit.symbol}</Td>
              <Td>{city?.nameEn ?? "—"}</Td>
              <Td className="num">{Number(recipients)}</Td>
              <Td className="num">{Number(quotes)}</Td>
              <Td><Badge tone={rfqStatusTone(r.status)}>{r.status.replace(/_/g, " ")}</Badge></Td>
              <Td className="num">{formatDate(r.createdAt)}</Td>
            </tr>
          )) : <EmptyRow colSpan={9}>No buyer requests yet.</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/enquiries", { ...f, page: p })} />
    </div>
  );
}
