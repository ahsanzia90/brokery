import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { getVerificationDetail } from "@/lib/admin/verifications-service";
import { AdminPageHeader, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton, ActionForm } from "@/components/admin/action-button";
import { Badge, verificationTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { approveVerificationAction, claimVerificationAction, deleteDocumentAction, rejectVerificationAction, requestInfoAction, setRetentionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function VerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("verification.review");
  const { id } = await params;
  const d = await getVerificationDetail(id);
  if (!d) notFound();
  const { v, b, owner } = d;
  const open = !["approved", "rejected"].includes(v.status);
  const sel = "rounded border border-border-strong p-2 text-sm";
  return (
    <div>
      <AdminPageHeader title={`Verification: ${b.name}`} breadcrumbs={[{ label: "Verifications", href: "/admin/verifications" }, { label: b.name }]} description={<>Status <Badge tone="info">{v.status.replace(/_/g, " ")}</Badge> · requested level <strong>{v.requestedLevel.replace(/_/g, " ")}</strong> · current label <Badge tone={verificationTone(b.verificationLevel)}>{b.verificationLevel.replace(/_/g, " ")}</Badge></>} actions={
        open ? (
          <>
            {["submitted", "more_info_requested"].includes(v.status) && <ActionButton action={claimVerificationAction} payload={{ id }} variant="outline">Claim for review</ActionButton>}
            <ActionButton action={approveVerificationAction} payload={{ id }} variant="primary" select={{ name: "level", label: "Verification level to grant", options: [{ value: "documents_reviewed", label: "Business documents reviewed" }, { value: "admin_verified", label: "Admin verified (documents + manual checks)" }], defaultValue: v.requestedLevel === "admin_verified" ? "admin_verified" : "documents_reviewed" }} confirm={{ title: "Approve verification?", body: "The public profile will show the chosen label. Only choose a level you have actually checked." }}>Approve</ActionButton>
            <ActionButton action={requestInfoAction} payload={{ id }} variant="outline" requireReason reasonLabel="Message to the business (what is missing)" confirm={{ title: "Request more information" }}>Request more info</ActionButton>
            <ActionButton action={rejectVerificationAction} payload={{ id }} variant="danger" requireReason confirm={{ title: "Reject this request?", body: "The business keeps its current label. The reason is sent to the owner." }}>Reject</ActionButton>
          </>
        ) : null
      } />
      {v.reviewReason && <Alert tone={v.status === "rejected" ? "danger" : v.status === "approved" ? "success" : "warning"} title={`Reviewer note (${d.reviewer?.name ?? "—"}${v.reviewedAt ? ", " + formatDateTime(v.reviewedAt) : ""})`} className="mb-4">{v.reviewReason}</Alert>}
      {v.applicantNotes && <Alert tone="info" title="Applicant notes" className="mb-4">{v.applicantNotes}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Business details</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-semibold">Name: </dt><dd className="inline">{b.name} (<Link href={`/supplier/${b.slug}`} className="text-primary hover:underline">public profile</Link> · <Link href={`/admin/businesses/${b.id}`} className="text-primary hover:underline">admin</Link>)</dd></div>
            <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{b.businessType}</dd></div>
            <div><dt className="inline font-semibold">City: </dt><dd className="inline">{d.city?.nameEn ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{b.addressLine ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Registration no.: </dt><dd className="inline num">{b.registrationNumber ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Contact person: </dt><dd className="inline">{b.contactPersonName ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Public phone: </dt><dd className="inline num">{formatPhoneDisplay(b.publicPhone) || "—"}</dd></div>
            <div><dt className="inline font-semibold">WhatsApp: </dt><dd className="inline num">{formatPhoneDisplay(b.whatsappNumber) || "—"}</dd></div>
            <div><dt className="inline font-semibold">Website: </dt><dd className="inline">{b.website ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Years in business: </dt><dd className="inline num">{b.yearsInBusiness ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Description: </dt><dd className="inline">{b.description ?? "—"}</dd></div>
          </dl>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Owner</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-semibold">Name: </dt><dd className="inline"><Link href={`/admin/users/${owner.id}`} className="text-primary hover:underline">{owner.name}</Link></dd></div>
            <div><dt className="inline font-semibold">Phone: </dt><dd className="inline num">{formatPhoneDisplay(owner.phone)} {owner.phoneVerifiedAt ? <Badge tone="success">verified</Badge> : <Badge tone="warning">unverified</Badge>}</dd></div>
            <div><dt className="inline font-semibold">Account status: </dt><dd className="inline">{owner.status}</dd></div>
            <div><dt className="inline font-semibold">Joined: </dt><dd className="inline num">{formatDate(owner.createdAt)}</dd></div>
          </dl>
        </section>
      </div>
      <h2 className="mb-2 mt-6 font-bold">Documents (private)</h2>
      <p className="mb-2 text-sm text-text-muted">Files open through the authenticated private file route and are never public. Set a retention date so documents are purged after review.</p>
      <Table>
        <thead><tr><Th>Type</Th><Th>File</Th><Th>Uploaded</Th><Th>Retention until</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {d.docs.length ? d.docs.map((doc) => (
            <tr key={doc.id}>
              <Td>{doc.documentType}</Td>
              <Td><a href={`/files/private/${doc.storagePath}`} target="_blank" rel="noopener" className="text-primary hover:underline">{doc.originalFilename}</a> <span className="text-xs text-text-muted num">({Math.round(doc.sizeBytes / 1024)} KB, {doc.mimeType})</span></Td>
              <Td className="num">{formatDateTime(doc.createdAt)}</Td>
              <Td className="num">{doc.retentionUntil ? formatDate(doc.retentionUntil) : "—"}</Td>
              <Td>
                <div className="flex flex-wrap items-end gap-2">
                  <ActionForm action={setRetentionAction} payload={{ documentId: doc.id }} submitLabel="Set" variant="outline" successMessage="Retention updated" className="flex items-end gap-1">
                    <input type="date" name="retentionUntil" className={sel} aria-label="Retention date" />
                  </ActionForm>
                  <ActionButton action={deleteDocumentAction} payload={{ documentId: doc.id }} variant="danger" requireReason confirm={{ title: "Delete this document?", body: "The file is removed from storage. Use after the review is complete." }}>Delete</ActionButton>
                </div>
              </Td>
            </tr>
          )) : <EmptyRow colSpan={5}>No documents attached.</EmptyRow>}
        </tbody>
      </Table>
      <h2 className="mb-2 mt-6 font-bold">Request history for this business</h2>
      <Table>
        <thead><tr><Th>Submitted</Th><Th>Requested</Th><Th>Status</Th><Th>Reviewed</Th><Th>Reason</Th></tr></thead>
        <tbody>
          {d.history.map((h) => (
            <tr key={h.id} className={h.id === v.id ? "bg-primary-soft/40" : ""}>
              <Td className="num">{formatDateTime(h.createdAt)}</Td>
              <Td>{h.requestedLevel.replace(/_/g, " ")}</Td>
              <Td>{h.status.replace(/_/g, " ")}</Td>
              <Td className="num">{h.reviewedAt ? formatDateTime(h.reviewedAt) : "—"}</Td>
              <Td>{h.reviewReason ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
