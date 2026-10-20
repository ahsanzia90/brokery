import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { listBusinesses, VERIFICATION_LEVELS } from "@/lib/admin/verifications-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, FilterCheck, Labeled, SearchInput, Table, Td, Th } from "@/components/admin/ui";
import { Badge, verificationTone } from "@/components/ui/badge";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("verification.review");
  const sp = await searchParams;
  const f = { q: str(sp, "q"), status: str(sp, "status"), level: str(sp, "level"), featured: str(sp, "featured"), page: int(sp, "page") };
  const res = await listBusinesses(f);
  const sel = "adm-control";
  return (
    <div>
      <AdminPageHeader title="Businesses" description="All supplier business profiles. Feature, suspend or adjust verification from a business page." breadcrumbs={[{ label: "Verifications", href: "/admin/verifications" }, { label: "Businesses" }]} />
      <FilterBar resetHref="/admin/businesses">
        <SearchInput value={f.q} placeholder="Business name or slug" />
        <Labeled label="Status"><select name="status" defaultValue={f.status} className="adm-control"><option value="">Any status</option>{["active", "suspended", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}</select></Labeled>
        <Labeled label="Label"><select name="level" defaultValue={f.level} className="adm-control"><option value="">Any label</option>{VERIFICATION_LEVELS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></Labeled>
        <FilterCheck name="featured" label="Featured only" checked={f.featured === "1"} />
      </FilterBar>
      <p className="mb-2 text-sm text-muted num">{res.total} businesses</p>
      <Table>
        <thead><tr><Th>Business</Th><Th>Owner</Th><Th>City</Th><Th>Label</Th><Th>Status</Th><Th>Listings</Th><Th>Open reports</Th><Th>Created</Th></tr></thead>
        <tbody>
          {res.rows.length ? res.rows.map(({ b, owner, city, listingCount, openReports }) => (
            <tr key={b.id}>
              <Td><Link href={`/admin/businesses/${b.id}`} className="font-semibold adm-link">{b.name}</Link>{b.isFeatured && <Badge tone="accent" className="ms-2">featured</Badge>}</Td>
              <Td><Link href={`/admin/users/${owner.id}`} className="hover:underline">{owner.name}</Link></Td>
              <Td>{city?.nameEn ?? "—"}</Td>
              <Td><Badge tone={verificationTone(b.verificationLevel)}>{b.verificationLevel.replace(/_/g, " ")}</Badge></Td>
              <Td><Badge tone={b.status === "active" ? "success" : "danger"}>{b.status}</Badge></Td>
              <Td className="num">{Number(listingCount)}</Td>
              <Td className={Number(openReports) > 0 ? "font-bold text-danger num" : "num"}>{Number(openReports)}</Td>
              <Td className="num">{formatDate(b.createdAt)}</Td>
            </tr>
          )) : <EmptyRow colSpan={8}>No businesses found.</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={res.page} totalPages={res.totalPages} makeHref={(p) => qs("/admin/businesses", { ...f, page: p })} />
    </div>
  );
}
