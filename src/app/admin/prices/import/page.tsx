import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { listImportJobs, CSV_COLUMNS } from "@/lib/prices/csv";
import { ImportForm } from "@/components/admin/prices/import-form";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PriceImportPage() {
  const user = await requireAdminPage("prices.edit");
  const jobs = await listImportJobs(20);
  return (
    <div>
      <AdminPageHeader title="Import prices from CSV" description="Upload a CSV of observed rates. Each row is validated; valid rows become pending-review records (or are published directly if you choose so and have the publish permission)." breadcrumbs={[{ label: "Market prices", href: "/admin/prices" }, { label: "Import CSV" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <ImportForm canPublish={hasPermission(user.roles, "prices.publish")} />
          <h2 className="mb-2 mt-8 text-lg font-bold">Past imports</h2>
          <Table>
            <thead>
              <tr>
                <Th>File</Th>
                <Th>When</Th>
                <Th>Status</Th>
                <Th className="text-end">Rows</Th>
                <Th className="text-end">Imported</Th>
                <Th className="text-end">Failed</Th>
                <Th>Errors</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && <EmptyRow colSpan={7}>No imports yet.</EmptyRow>}
              {jobs.map((j) => (
                <tr key={j.id}>
                  <Td className="font-semibold">{j.filename}</Td>
                  <Td className="num text-sm">{formatDateTime(j.createdAt)}</Td>
                  <Td><Badge tone={j.status === "completed" ? "success" : j.status === "partial" ? "warning" : j.status === "failed" ? "danger" : "info"}>{j.status}</Badge></Td>
                  <Td className="text-end num">{j.totalRows}</Td>
                  <Td className="text-end num">{j.importedRows}</Td>
                  <Td className="text-end num">{j.failedRows}</Td>
                  <Td className="text-sm">
                    {j.errors.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-primary">{j.errors.length} error(s)</summary>
                        <ul className="mt-1 list-disc ps-4 text-text-muted">
                          {j.errors.slice(0, 20).map((e, i) => (
                            <li key={i}>Row {e.row}: {e.message}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <aside className="card h-fit p-4 text-sm">
          <h2 className="font-bold">CSV format</h2>
          <p className="mt-1 text-text-muted">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/prices/import/template" className="font-semibold text-primary underline" download>Download the template</a>. Lines starting with # are ignored.
          </p>
          <p className="mt-2 font-semibold">Columns</p>
          <code className="mt-1 block break-words rounded bg-surface-muted p-2 text-xs font-latin">{CSV_COLUMNS.join(",")}</code>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-text-muted">
            <li><b>commodity</b>, <b>location</b>, <b>amount</b>, <b>unit</b>, <b>observation_date</b> (YYYY-MM-DD) and <b>source</b> are required.</li>
            <li>commodity / variety / grade / location / unit accept slugs, English names or known aliases (e.g. “chawal”).</li>
            <li>price_type: indicative (default), supplier_offer, buyer_reported, official_reference.</li>
            <li>Unknown source names are created automatically as type “other”.</li>
            <li>Rows that fail validation are skipped and listed with the reason; the rest are imported.</li>
            <li>Max file size 2 MB.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
