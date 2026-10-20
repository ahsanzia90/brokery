import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { CASE_STATUSES, CASE_TYPES, SEVERITIES, listCases, listListingReports } from "@/lib/admin/cases-service";
import { listAdminUsers } from "@/lib/admin/users-service";
import { AdminPageHeader, AdminPagination, EmptyRow, FilterBar, Labeled, Table, Td, Th } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { formatDate } from "@/lib/utils/format";
import { resolveListingReportAction } from "./actions";

export const dynamic = "force-dynamic";
const sevTone = (s: string) => (s === "critical" ? "danger" : s === "high" ? "warning" : s === "medium" ? "info" : "neutral");
const statusTone = (s: string) => (s === "open" ? "danger" : s === "in_progress" ? "info" : s === "waiting_on_user" ? "warning" : "neutral");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("reports.manage");
  const sp = await searchParams;
  const tab = str(sp, "tab", "cases");
  const f = { status: str(sp, "status", "open_all"), type: str(sp, "type"), severity: str(sp, "severity"), assigned: str(sp, "assigned"), page: int(sp, "page") };
  const sel = "adm-control";
  const admins = await listAdminUsers();
  const cases = tab === "cases" ? await listCases(f) : null;
  const reports = tab === "listing_reports" ? await listListingReports({ status: f.status, page: f.page }) : null;
  return (
    <div>
      <AdminPageHeader title="Reports & cases" description="Listing reports, supplier reports, spam, misleading prices, fraud allegations, prohibited goods, privacy complaints and support requests." />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href={qs("/admin/reports", { tab: "cases" })} className={`rounded-full px-4 py-1.5 font-semibold ${tab === "cases" ? "bg-primary text-white" : "border border-line"}`}>Support cases</Link>
        <Link href={qs("/admin/reports", { tab: "listing_reports" })} className={`rounded-full px-4 py-1.5 font-semibold ${tab === "listing_reports" ? "bg-primary text-white" : "border border-line"}`}>Listing reports</Link>
      </div>
      <FilterBar resetHref="/admin/reports">
        <input type="hidden" name="tab" value={tab} />
        <Labeled label="Status"><select name="status" defaultValue={f.status} className="adm-control">
          <option value="open_all">Open (any)</option>
          <option value="">All</option>
          {(tab === "cases" ? CASE_STATUSES : ["open", "under_review", "resolved", "dismissed"]).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select></Labeled>
        {tab === "cases" && (
          <>
            <Labeled label="Type"><select name="type" defaultValue={f.type} className="adm-control"><option value="">Any type</option>{CASE_TYPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></Labeled>
            <Labeled label="Severity"><select name="severity" defaultValue={f.severity} className="adm-control"><option value="">Any severity</option>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Labeled>
            <Labeled label="Assignee"><select name="assigned" defaultValue={f.assigned} className="adm-control"><option value="">Any assignee</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.name || a.phone}</option>)}</select></Labeled>
          </>
        )}
      </FilterBar>
      {cases && (
        <>
          <p className="mb-2 text-sm text-muted num">{cases.total} cases</p>
          <Table>
            <thead><tr><Th>Reference</Th><Th>Type</Th><Th>Subject</Th><Th>Severity</Th><Th>Status</Th><Th>Assigned</Th><Th>Created</Th></tr></thead>
            <tbody>
              {cases.rows.length ? cases.rows.map(({ c, assignee }) => (
                <tr key={c.id}>
                  <Td><Link href={`/admin/reports/${c.id}`} className="font-semibold adm-link num">{c.reference}</Link></Td>
                  <Td>{c.caseType.replace(/_/g, " ")}</Td>
                  <Td>{c.subject}</Td>
                  <Td><Badge tone={sevTone(c.severity)}>{c.severity}</Badge></Td>
                  <Td><Badge tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Badge></Td>
                  <Td>{assignee?.name ?? "—"}</Td>
                  <Td className="num">{formatDate(c.createdAt)}</Td>
                </tr>
              )) : <EmptyRow colSpan={7}>No cases match.</EmptyRow>}
            </tbody>
          </Table>
          <AdminPagination page={cases.page} totalPages={cases.totalPages} makeHref={(p) => qs("/admin/reports", { tab, ...f, page: p })} />
        </>
      )}
      {reports && (
        <>
          <p className="mb-2 text-sm text-muted num">{reports.total} listing reports</p>
          <Table>
            <thead><tr><Th>Listing / business</Th><Th>Reason</Th><Th>Details</Th><Th>Reporter</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {reports.rows.length ? reports.rows.map(({ r, listing, biz, reporter }) => (
                <tr key={r.id}>
                  <Td>{listing ? <Link href={`/admin/listings/${listing.id}`} className="adm-link">{listing.title}</Link> : biz ? <Link href={`/admin/businesses/${biz.id}`} className="adm-link">{biz.name}</Link> : "—"}</Td>
                  <Td>{r.reason.replace(/_/g, " ")}</Td>
                  <Td className="max-w-[280px]">{r.description ?? "—"}{r.resolution && <span className="block text-xs text-muted">Resolution: {r.resolution}</span>}</Td>
                  <Td>{reporter?.name ?? "guest"}</Td>
                  <Td><Badge tone={r.status === "open" ? "danger" : r.status === "under_review" ? "info" : "neutral"}>{r.status.replace(/_/g, " ")}</Badge></Td>
                  <Td className="num">{formatDate(r.createdAt)}</Td>
                  <Td>
                    {["open", "under_review"].includes(r.status) && (
                      <div className="flex flex-wrap gap-1">
                        {r.status === "open" && <ActionButton action={resolveListingReportAction} payload={{ id: r.id, status: "under_review" }}>Take</ActionButton>}
                        <ActionButton action={resolveListingReportAction} payload={{ id: r.id, status: "resolved" }} variant="primary" requireReason reasonLabel="Resolution (sent to reporter)" confirm={{ title: "Resolve report" }}>Resolve</ActionButton>
                        <ActionButton action={resolveListingReportAction} payload={{ id: r.id, status: "dismissed" }} requireReason reasonLabel="Why dismissed (sent to reporter)" confirm={{ title: "Dismiss report" }}>Dismiss</ActionButton>
                      </div>
                    )}
                  </Td>
                </tr>
              )) : <EmptyRow colSpan={7}>No listing reports.</EmptyRow>}
            </tbody>
          </Table>
          <AdminPagination page={reports.page} totalPages={reports.totalPages} makeHref={(p) => qs("/admin/reports", { tab, status: f.status, page: p })} />
        </>
      )}
    </div>
  );
}
