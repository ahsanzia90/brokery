import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { CASE_STATUSES, SEVERITIES, getCaseDetail } from "@/lib/admin/cases-service";
import { listAdminUsers } from "@/lib/admin/users-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionButton, ActionForm } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { addNoteAction, assignCaseAction, setCaseStatusAction, setSeverityAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("reports.manage");
  const { id } = await params;
  const d = await getCaseDetail(id);
  if (!d) notFound();
  const { c } = d;
  const admins = await listAdminUsers();
  const byId = new Map(admins.map((a) => [a.id, a.name || a.phone]));
  const closed = c.status === "resolved" || c.status === "dismissed";
  return (
    <div>
      <AdminPageHeader title={`${c.reference} · ${c.subject}`} breadcrumbs={[{ label: "Reports & cases", href: "/admin/reports" }, { label: c.reference }]} description={<><Badge tone="info">{c.caseType.replace(/_/g, " ")}</Badge> <Badge tone={c.severity === "critical" ? "danger" : c.severity === "high" ? "warning" : "neutral"}>{c.severity}</Badge> <Badge tone={closed ? "neutral" : "danger"}>{c.status.replace(/_/g, " ")}</Badge> · created <span className="num">{formatDateTime(c.createdAt)}</span></>} actions={
        <>
          {c.assignedTo !== actor.id && <ActionButton action={assignCaseAction} payload={{ id, assignedTo: "me" }} variant="outline">Assign to me</ActionButton>}
          <ActionButton action={assignCaseAction} payload={{ id }} variant="outline" select={{ name: "assignedTo", label: "Assign to", options: [{ value: "", label: "Unassigned" }, ...admins.map((a) => ({ value: a.id, label: a.name || a.phone }))], defaultValue: c.assignedTo ?? "" }} confirm={{ title: "Assign case" }}>Assign…</ActionButton>
          <ActionButton action={setSeverityAction} payload={{ id }} variant="outline" select={{ name: "severity", label: "Severity", options: SEVERITIES.map((s) => ({ value: s, label: s })), defaultValue: c.severity }} confirm={{ title: "Set severity" }}>Severity…</ActionButton>
          <ActionButton action={setCaseStatusAction} payload={{ id }} variant="primary" requireReason reasonLabel="Resolution / note (sent to the reporter when closing)" select={{ name: "status", label: "New status", options: CASE_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })), defaultValue: closed ? "open" : "resolved" }} confirm={{ title: "Change status" }}>Set status…</ActionButton>
        </>
      } />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-2 font-bold">Description</h2>
          <p className="whitespace-pre-wrap text-sm">{c.description || <span className="text-text-muted">—</span>}</p>
          {c.resolution && <p className="mt-3 rounded bg-primary-soft p-3 text-sm"><strong>Resolution:</strong> {c.resolution}</p>}
          <h2 className="mb-2 mt-5 font-bold">Notes</h2>
          {c.notes.length ? <ul className="space-y-2 text-sm">{c.notes.map((n, i) => <li key={i} className="rounded border border-border p-2"><span className="text-xs text-text-muted num">{formatDateTime(n.at)} · {n.by ? byId.get(n.by) ?? n.by.slice(0, 8) : "system"}</span><br />{n.text}</li>)}</ul> : <p className="text-sm text-text-muted">No notes yet.</p>}
          <ActionForm action={addNoteAction} payload={{ id }} submitLabel="Add note" successMessage="Note added" className="mt-3">
            <textarea name="text" required rows={3} placeholder="Internal note (visible to admins only)" className="w-full rounded border border-border-strong p-2 text-sm" />
          </ActionForm>
        </section>
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Linked entity</h2>
            {d.linked ? <p className="text-sm">{d.linked.kind}: <Link href={d.linked.adminHref} className="text-primary hover:underline">{d.linked.label}</Link>{d.linked.href !== d.linked.adminHref && <> · <Link href={d.linked.href} className="text-primary hover:underline">public</Link></>}</p> : <p className="text-sm text-text-muted">None</p>}
            {d.linked?.kind === "listing" && <p className="mt-2 text-xs text-text-muted">Quick action: open the listing in admin to hide it.</p>}
            {d.linked?.kind === "business" && <p className="mt-2 text-xs text-text-muted">Quick action: open the business in admin to suspend it.</p>}
          </section>
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Reporter</h2>
            {d.reporter ? <p className="text-sm"><Link href={`/admin/users/${d.reporter.id}`} className="text-primary hover:underline">{d.reporter.name}</Link> · <span className="num">{formatPhoneDisplay(d.reporter.phone)}</span></p> : <p className="text-sm">{c.reporterContact ?? "Guest / unknown"}</p>}
          </section>
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Assignment</h2>
            <p className="text-sm">{d.assignee?.name ?? "Unassigned"}</p>
            {c.resolvedAt && <p className="mt-1 text-sm text-text-muted num">Resolved {formatDateTime(c.resolvedAt)}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
