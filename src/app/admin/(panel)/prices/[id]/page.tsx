import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { AdminPageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { getPriceById, getPriceVersions } from "@/lib/prices/queries";
import { formatDateTime, formatPKR, formatDate } from "@/lib/utils/format";
import { PriceRecordActions } from "@/components/admin/prices/record-actions";
import { str, type SearchParams } from "@/lib/admin/params";

export const dynamic = "force-dynamic";

export default async function PriceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("prices.edit");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await getPriceById(id);
  if (!row) notFound();
  const versions = await getPriceVersions(id);
  const canPublish = hasPermission(user.roles, "prices.publish");
  const tone = row.p.status === "published" ? "success" : row.p.status === "pending_review" ? "warning" : row.p.status === "rejected" ? "danger" : "neutral";
  return (
    <div>
      <AdminPageHeader
        title={`${row.commodity.nameEn}${row.variety ? ` — ${row.variety.nameEn}` : ""}${row.grade ? ` (${row.grade.nameEn})` : ""} · ${row.loc.nameEn}`}
        breadcrumbs={[{ label: "Market prices", href: "/admin/prices" }, { label: "Record" }]}
        actions={
          <>
            {["draft", "pending_review", "published"].includes(row.p.status) && (
              <Link href={`/admin/prices/${id}/edit`} className={buttonClass("outline", "sm")}>
                {row.p.status === "published" ? "Correct" : "Edit"}
              </Link>
            )}
            {["published", "superseded", "expired"].includes(row.p.status) && (
              <Link href={`/prices/${row.commodity.slug}/history/${id}`} className={buttonClass("ghost", "sm")} target="_blank">
                Public view ↗
              </Link>
            )}
          </>
        }
      />
      {str(sp, "done") && <Alert tone="success" className="mb-4">Saved. Status: {str(sp, "done").replace("_", " ")}.</Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-3xl font-extrabold num">
                {formatPKR(row.p.amount)} <span className="text-base font-semibold text-muted">/ {row.unit.symbol}</span>
              </p>
              <Badge tone={tone}>{row.p.status.replace("_", " ")}</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-[0.95rem] sm:grid-cols-2">
              <div><dt className="text-sm text-muted">Type</dt><dd>{row.p.priceType.replace("_", " ")}</dd></div>
              <div><dt className="text-sm text-muted">Observed</dt><dd className="num">{formatDate(row.p.observationDate)}</dd></div>
              <div><dt className="text-sm text-muted">Range</dt><dd className="num">{row.p.lowAmount && row.p.highAmount ? `${formatPKR(row.p.lowAmount)} – ${formatPKR(row.p.highAmount)}` : "—"}</dd></div>
              <div><dt className="text-sm text-muted">Previous / change</dt><dd className="num">{row.p.previousAmount ? `${formatPKR(row.p.previousAmount)} (${row.p.changePercent ?? "0"}%)` : "—"}</dd></div>
              <div><dt className="text-sm text-muted">Source</dt><dd>{row.source ? <>{row.source.name}{row.source.url && <a href={row.source.url} target="_blank" rel="noopener" className="ms-1 text-primary underline">↗</a>}</> : <span className="text-danger">Missing — required to publish</span>}</dd></div>
              <div><dt className="text-sm text-muted">Source reference</dt><dd className="break-words">{row.p.sourceReference ?? "—"}</dd></div>
              <div><dt className="text-sm text-muted">Published</dt><dd className="num">{row.p.publishedAt ? formatDateTime(row.p.publishedAt) : "—"}</dd></div>
              <div><dt className="text-sm text-muted">Valid until</dt><dd className="num">{row.p.validUntil ? formatDateTime(row.p.validUntil) : "—"}</dd></div>
              <div><dt className="text-sm text-muted">Created</dt><dd className="num">{formatDateTime(row.p.createdAt)}</dd></div>
              <div><dt className="text-sm text-muted">Import job</dt><dd>{row.p.importJobId ? <Link href="/admin/prices/import" className="text-primary underline">from CSV import</Link> : "manual"}</dd></div>
              {row.p.notes && <div className="sm:col-span-2"><dt className="text-sm text-muted">Notes</dt><dd className="whitespace-pre-line">{row.p.notes}</dd></div>}
            </dl>
          </div>

          <section className="card p-4">
            <h2 className="adm-section">Version history</h2>
            <ol className="space-y-3">
              {versions.map((v) => {
                const snap = v.h.snapshot as Record<string, unknown>;
                return (
                  <li key={v.h.id} className="border-s-2 border-line ps-3">
                    <p className="font-semibold">
                      v{v.h.version} · {v.h.action}
                      <span className="ms-2 text-sm font-normal text-muted num">{formatDateTime(v.h.createdAt)} · {v.actorName || (v.h.actorId ? "admin" : "system")}</span>
                    </p>
                    {v.h.reason && <p className="text-sm text-muted">Reason: {v.h.reason}</p>}
                    {v.h.changedFields.length > 0 && (
                      <p className="text-sm text-muted">
                        Changed: {v.h.changedFields.join(", ")}
                        {v.h.changedFields.includes("amount") && typeof snap.amount === "string" ? ` → ${formatPKR(snap.amount)}` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        <aside>
          <PriceRecordActions id={id} status={row.p.status} canPublish={canPublish} hasSource={Boolean(row.p.sourceId)} />
        </aside>
      </div>
    </div>
  );
}
