import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { getBusinessDetail, VERIFICATION_LEVELS } from "@/lib/admin/verifications-service";
import { AdminPageHeader, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton, ActionForm } from "@/components/admin/action-button";
import { Badge, listingStatusTone, verificationTone } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { setBusinessFeaturedAction, setBusinessStatusAction, setVerificationLevelAction } from "../../verifications/actions";

export const dynamic = "force-dynamic";

export default async function BusinessDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("verification.review");
  const { id } = await params;
  const d = await getBusinessDetail(id);
  if (!d) notFound();
  const { b, owner } = d;
  const isSuper = actor.roles.includes("super_admin");
  return (
    <div>
      <AdminPageHeader title={b.name} breadcrumbs={[{ label: "Businesses", href: "/admin/businesses" }, { label: b.name }]} description={<><Badge tone={verificationTone(b.verificationLevel)}>{b.verificationLevel.replace(/_/g, " ")}</Badge> <Badge tone={b.status === "active" ? "success" : "danger"}>{b.status}</Badge> {b.isFeatured && <Badge tone="accent">featured{b.featuredUntil ? ` until ${formatDate(b.featuredUntil)}` : ""}</Badge>} · <Link href={`/supplier/${b.slug}`} className="text-primary hover:underline">public profile</Link></>} actions={
        <>
          {b.status === "active" ? <ActionButton action={setBusinessStatusAction} payload={{ id, status: "suspended" }} variant="danger" requireReason confirm={{ title: "Suspend this business?", body: "Its profile and listings stop appearing publicly. The owner is notified." }}>Suspend business</ActionButton> : <ActionButton action={setBusinessStatusAction} payload={{ id, status: "active" }} variant="primary" confirm={{ title: "Reactivate business?" }}>Reactivate</ActionButton>}
          {b.isFeatured ? <ActionButton action={setBusinessFeaturedAction} payload={{ id, featured: "0" }} variant="outline" confirm={{ title: "Remove from featured suppliers?" }}>Unfeature</ActionButton> : null}
        </>
      } />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Details</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-semibold">Owner: </dt><dd className="inline"><Link href={`/admin/users/${owner.id}`} className="text-primary hover:underline">{owner.name}</Link> · <span className="num">{formatPhoneDisplay(owner.phone)}</span></dd></div>
            <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{b.businessType}</dd></div>
            <div><dt className="inline font-semibold">City: </dt><dd className="inline">{d.city?.nameEn ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Public phone: </dt><dd className="inline num">{formatPhoneDisplay(b.publicPhone) || "—"} {b.showPhonePublicly ? "(shown)" : "(hidden)"}</dd></div>
            <div><dt className="inline font-semibold">WhatsApp: </dt><dd className="inline num">{formatPhoneDisplay(b.whatsappNumber) || "—"} {b.showWhatsappPublicly ? "(shown)" : "(hidden)"}</dd></div>
            <div><dt className="inline font-semibold">Registration no.: </dt><dd className="inline num">{b.registrationNumber ?? "—"} <span className="text-text-muted">(private)</span></dd></div>
            <div><dt className="inline font-semibold">Created: </dt><dd className="inline num">{formatDateTime(b.createdAt)}</dd></div>
            <div><dt className="inline font-semibold">Private documents: </dt><dd className="inline num">{d.docs.length}</dd></div>
          </dl>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Feature on homepage</h2>
          <p className="mb-2 text-sm text-text-muted">Featured suppliers appear in the homepage &ldquo;Verified suppliers&rdquo; section (only when their label is documents reviewed or admin verified).</p>
          <ActionForm action={setBusinessFeaturedAction} payload={{ id, featured: "1" }} submitLabel={b.isFeatured ? "Update feature period" : "Feature this business"} successMessage="Feature settings saved">
            <label className="block text-sm"><span className="font-semibold">Featured until (optional)</span><input type="date" name="featuredUntil" defaultValue={b.featuredUntil ? b.featuredUntil.toISOString().slice(0, 10) : ""} className="mt-1 block rounded border border-border-strong p-2" /></label>
          </ActionForm>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Verification label</h2>
          <p className="mb-2 text-sm text-text-muted">Normally changed by approving a verification request. Direct changes are restricted to super admins and always need a reason.</p>
          {isSuper ? (
            <ActionButton action={setVerificationLevelAction} payload={{ id }} variant="outline" requireReason select={{ name: "level", label: "New label", options: VERIFICATION_LEVELS.map((l) => ({ value: l, label: l.replace(/_/g, " ") })), defaultValue: b.verificationLevel }} confirm={{ title: "Change verification label", body: "Only set a label that reflects checks actually performed." }}>Set label directly</ActionButton>
          ) : <p className="text-sm text-text-muted">Super admin only.</p>}
          <Link href="/admin/verifications" className="mt-3 block text-sm text-primary hover:underline">Verification requests ›</Link>
        </section>
      </div>
      <h2 className="mb-2 mt-6 font-bold">Verification requests</h2>
      <Table>
        <thead><tr><Th>Submitted</Th><Th>Requested</Th><Th>Status</Th><Th>Reason</Th></tr></thead>
        <tbody>{d.verifications.length ? d.verifications.map((v) => <tr key={v.id}><Td className="num"><Link href={`/admin/verifications/${v.id}`} className="text-primary hover:underline">{formatDateTime(v.createdAt)}</Link></Td><Td>{v.requestedLevel.replace(/_/g, " ")}</Td><Td>{v.status.replace(/_/g, " ")}</Td><Td>{v.reviewReason ?? "—"}</Td></tr>) : <EmptyRow colSpan={4}>No requests.</EmptyRow>}</tbody>
      </Table>
      <h2 className="mb-2 mt-6 font-bold">Recent listings</h2>
      <Table>
        <thead><tr><Th>Title</Th><Th>Status</Th><Th>Created</Th></tr></thead>
        <tbody>{d.recentListings.length ? d.recentListings.map((l) => <tr key={l.id}><Td><Link href={`/admin/listings/${l.id}`} className="text-primary hover:underline">{l.title}</Link></Td><Td><Badge tone={listingStatusTone(l.status)}>{l.status}</Badge></Td><Td className="num">{formatDate(l.createdAt)}</Td></tr>) : <EmptyRow colSpan={3}>No listings.</EmptyRow>}</tbody>
      </Table>
    </div>
  );
}
