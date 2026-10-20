import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { listListings, LISTING_STATUSES } from "@/lib/admin/listings-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, FilterCheck, Labeled, SearchInput, Table, Td, Th } from "@/components/admin/ui";
import { Badge, listingStatusTone, verificationTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils/labels";
import { Alert } from "@/components/ui/alert";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";
import { bulkApproveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("listings.moderate");
  const sp = await searchParams;
  const f = { status: str(sp, "status", "pending_review"), q: str(sp, "q"), city: str(sp, "city"), business: str(sp, "business"), flagged: str(sp, "flagged"), restricted: str(sp, "restricted"), page: int(sp, "page") };
  const res = await listListings(f);
  const sel = "adm-control";
  const ok = str(sp, "ok");
  const error = str(sp, "error");
  return (
    <div>
      <AdminPageHeader title="Listings" description="Review submitted listings before they go public. Restricted categories (chemicals, fuels, crop protection…) need documents and a manual check." />
      {ok && <Alert tone="success" className="mb-4">{ok}</Alert>}
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <FilterBar resetHref="/admin/listings">
        <Labeled label="Status"><select name="status" defaultValue={f.status} className="adm-control">
          <option value="all">All statuses</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select></Labeled>
        <SearchInput value={f.q} placeholder="Title, commodity or business" />
        <input name="city" defaultValue={f.city} placeholder="City" className="adm-control" />
        <FilterCheck name="flagged" label="Reported" checked={f.flagged === "1"} />
        <FilterCheck name="restricted" label="Restricted categories" checked={f.restricted === "1"} />
      </FilterBar>
      <form action={bulkApproveAction}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted num">{res.total} listings</p>
          {f.status === "pending_review" && res.rows.length > 0 && <button type="submit" className="adm-btn-outline">Approve selected</button>}
        </div>
        <Table>
          <thead><tr>{f.status === "pending_review" && <Th />}<Th>Listing</Th><Th>Commodity</Th><Th>Qty</Th><Th>Price</Th><Th>City</Th><Th>Business</Th><Th>Status</Th><Th>Created</Th></tr></thead>
          <tbody>
            {res.rows.length ? res.rows.map(({ l, commodity, biz, city, unit, reports }) => (
              <tr key={l.id} className={Number(reports) > 0 ? "bg-danger-soft/40" : ""}>
                {f.status === "pending_review" && <Td><input type="checkbox" name="ids" value={l.id} aria-label={`Select ${l.title}`} /></Td>}
                <Td><Link href={`/admin/listings/${l.id}`} className="font-semibold adm-link">{l.title}</Link>{Number(reports) > 0 && <Badge tone="danger" className="ms-2">{Number(reports)} reports</Badge>}</Td>
                <Td>{commodity.nameEn}</Td>
                <Td className="num">{formatNumber(l.quantity)} {unit.symbol}</Td>
                <Td className="num">{l.priceAmount ? formatPKR(l.priceAmount) : <span className="text-muted">{humanize(l.priceType)}</span>}</Td>
                <Td>{city?.nameEn ?? "—"}</Td>
                <Td><Link href={`/admin/businesses/${biz.id}`} className="hover:underline">{biz.name}</Link> <Badge tone={verificationTone(biz.verificationLevel)}>{biz.verificationLevel.replace(/_/g, " ")}</Badge></Td>
                <Td><Badge tone={listingStatusTone(l.status)}>{l.status.replace(/_/g, " ")}</Badge></Td>
                <Td className="num">{formatDate(l.createdAt)}</Td>
              </tr>
            )) : <EmptyRow colSpan={9}>No listings{f.status !== "all" ? ` with status ${f.status.replace(/_/g, " ")}` : ""}.</EmptyRow>}
          </tbody>
        </Table>
      </form>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/listings", { ...f, page: p })} />
    </div>
  );
}
