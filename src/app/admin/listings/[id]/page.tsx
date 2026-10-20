import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { getListingDetail } from "@/lib/admin/listings-service";
import { AdminPageHeader, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, listingStatusTone, verificationTone } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { approveListingAction, featureListingAction, flagPriceAction, hideListingAction, imageModerationAction, rejectListingAction, requestEditsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminListingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("listings.moderate");
  const { id } = await params;
  const d = await getListingDetail(id);
  if (!d) notFound();
  const { l, commodity, category, variety, grade, biz, seller, unit, city } = d;
  const moderation = commodity.moderationLevel ?? category.moderationLevel;
  const canApprove = ["pending_review", "draft", "rejected", "paused"].includes(l.status);
  return (
    <div>
      <AdminPageHeader title={l.title} breadcrumbs={[{ label: "Listings", href: "/admin/listings" }, { label: l.title }]} description={<><Badge tone={listingStatusTone(l.status)}>{l.status.replace(/_/g, " ")}</Badge> {l.isFeatured && <Badge tone="accent">featured</Badge>} · moderation level <strong>{moderation}</strong> · <Link href={`/listings/${l.slug}`} className="adm-link">public page</Link></>} actions={
        <>
          {canApprove && <ActionButton action={approveListingAction} payload={{ id }} variant="primary" confirm={{ title: "Publish this listing?", body: "It becomes visible to all buyers and pending images are approved. The seller is notified." }}>Approve & publish</ActionButton>}
          {l.status !== "rejected" && l.status !== "removed" && <ActionButton action={requestEditsAction} payload={{ id }} variant="outline" requireReason reasonLabel="What must the seller change?" confirm={{ title: "Request edits" }}>Request edits</ActionButton>}
          {l.status !== "rejected" && l.status !== "removed" && <ActionButton action={rejectListingAction} payload={{ id }} variant="danger" requireReason confirm={{ title: "Reject this listing?", body: "The seller sees the reason and can edit and resubmit." }}>Reject</ActionButton>}
          {l.status !== "removed" && <ActionButton action={hideListingAction} payload={{ id }} variant="outline" requireReason confirm={{ title: "Hide / remove this listing?", body: "Use for prohibited goods, fraud or policy violations." }}>Hide</ActionButton>}
          <ActionButton action={featureListingAction} payload={{ id, featured: l.isFeatured ? "0" : "1" }} variant="outline">{l.isFeatured ? "Unfeature" : "Feature"}</ActionButton>
          <ActionButton action={flagPriceAction} payload={{ id }} variant="outline" requireReason reasonLabel="Why does the price look suspicious?" confirm={{ title: "Flag suspicious price", body: "Creates a support case (misleading price) assigned to you." }} successMessage="Case created">Flag price</ActionButton>
        </>
      } />
      {l.statusReason && <Alert tone="warning" title="Status reason" className="mb-4">{l.statusReason}</Alert>}
      {moderation === "restricted" && <Alert tone="warning" className="mb-4">Restricted category: check the attached documents (registration, safety data sheet, licences) before publishing.</Alert>}
      {moderation === "prohibited" && <Alert tone="danger" className="mb-4">This commodity is marked prohibited. It must not be published.</Alert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-2 font-bold">Listing</h2>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div><dt className="inline font-semibold">Commodity</dt><dd className="inline">{commodity.nameEn} ({category.nameEn})</dd></div>
            <div><dt className="inline font-semibold">Variety</dt><dd className="inline">{variety?.nameEn ?? l.customVariety ?? "—"}{l.customVariety && <Badge tone="warning" className="ms-1">custom</Badge>}</dd></div>
            <div><dt className="inline font-semibold">Grade</dt><dd className="inline">{grade?.nameEn ?? l.customGrade ?? "—"}{l.customGrade && <Badge tone="warning" className="ms-1">custom</Badge>}</dd></div>
            <div><dt className="inline font-semibold">Quantity</dt><dd className="inline num">{formatNumber(l.quantity)} {unit.symbol}{l.quantityKg ? ` (≈ ${formatNumber(l.quantityKg)} kg)` : ""}</dd></div>
            <div><dt className="inline font-semibold">Price</dt><dd className="inline num">{l.priceAmount ? `${formatPKR(l.priceAmount)} / ${d.priceUnit?.symbol ?? "?"}` : "—"} ({l.priceType})</dd></div>
            <div><dt className="inline font-semibold">Min order</dt><dd className="inline num">{l.minOrderQuantity ? formatNumber(l.minOrderQuantity) : "—"}</dd></div>
            <div><dt className="inline font-semibold">City</dt><dd className="inline">{city?.nameEn ?? "—"} {l.pickupLocation ? `· ${l.pickupLocation}` : ""}</dd></div>
            <div><dt className="inline font-semibold">Delivery</dt><dd className="inline">{l.deliveryAvailable}</dd></div>
            <div><dt className="inline font-semibold">Condition / packaging</dt><dd className="inline">{l.condition} / {l.packaging ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Availability</dt><dd className="inline">{l.availability} {l.availableFrom ? `from ${l.availableFrom}` : ""}</dd></div>
            <div><dt className="inline font-semibold">Published / expires</dt><dd className="inline num">{formatDate(l.publishedAt) || "—"} / {formatDate(l.expiresAt) || "—"}</dd></div>
            <div><dt className="inline font-semibold">Views / contact clicks</dt><dd className="inline num">{l.viewCount} / {l.contactClickCount}</dd></div>
          </dl>
          <h3>Description</h3>
          <p className="whitespace-pre-wrap text-sm">{l.description || <span className="text-muted">—</span>}</p>
          {d.attrs.length > 0 && (
            <>
              <h3>Specifications</h3>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">{d.attrs.map(({ a, def }) => <div key={a.id}><dt className="inline font-semibold">{def.nameEn}</dt><dd className="inline">{a.valueText ?? a.valueNumber ?? (a.valueBoolean === null ? a.valueDate : a.valueBoolean ? "yes" : "no")} {def.unitLabel ?? ""}</dd></div>)}</dl>
            </>
          )}
          <h3>Images</h3>
          {d.images.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {d.images.map((img) => (
                <li key={img.id} className="card overflow-hidden p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/files/public/${img.storagePath}`} alt={img.altText ?? ""} className="aspect-[4/3] w-full rounded object-cover" />
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <Badge tone={img.moderationStatus === "approved" ? "success" : img.moderationStatus === "rejected" ? "danger" : "warning"}>{img.moderationStatus}</Badge>
                    <span className="flex gap-1">
                      {img.moderationStatus !== "approved" && <ActionButton action={imageModerationAction} payload={{ imageId: img.id, status: "approved" }} size="sm">OK</ActionButton>}
                      {img.moderationStatus !== "rejected" && <ActionButton action={imageModerationAction} payload={{ imageId: img.id, status: "rejected" }} size="sm" variant="danger">Reject</ActionButton>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No images.</p>}
          <h3>Documents</h3>
          {d.docs.length ? <ul className="text-sm">{d.docs.map((doc) => <li key={doc.id}><a href={`/files/private/${doc.storagePath}`} target="_blank" rel="noopener" className="adm-link">{doc.label}</a> <span className="text-muted">({doc.isPublic ? "public" : "private"}, {Math.round(doc.sizeBytes / 1024)} KB)</span></li>)}</ul> : <p className="text-sm text-muted">No documents{moderation === "restricted" ? " — required for restricted categories" : ""}.</p>}
        </section>
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Seller</h2>
            <p className="text-sm"><Link href={`/admin/businesses/${biz.id}`} className="font-semibold adm-link">{biz.name}</Link> <Badge tone={verificationTone(biz.verificationLevel)}>{biz.verificationLevel.replace(/_/g, " ")}</Badge></p>
            <p className="text-sm">Business status: {biz.status}</p>
            <p className="text-sm">Created by <Link href={`/admin/users/${seller.id}`} className="adm-link">{seller.name}</Link> · <span className="num">{formatPhoneDisplay(seller.phone)}</span></p>
            <p className="text-sm">Contact on listing: phone {l.contactPhoneEnabled ? "on" : "off"}, WhatsApp {l.contactWhatsappEnabled ? "on" : "off"}</p>
          </section>
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Possible duplicates</h2>
            <p className="mb-2 text-xs text-muted">Other listings by this business for the same commodity, by title similarity.</p>
            {d.duplicates.length ? <ul className="space-y-1 text-sm">{d.duplicates.map((x) => <li key={x.id}><Link href={`/admin/listings/${x.id}`} className="adm-link">{x.title}</Link> <Badge tone={listingStatusTone(x.status)}>{x.status}</Badge> <span className="text-xs text-muted num">{Math.round(Number(x.sim) * 100)}% similar</span></li>)}</ul> : <p className="text-sm text-muted">None.</p>}
          </section>
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Reports</h2>
            {d.reports.length ? <ul className="space-y-1 text-sm">{d.reports.map((r) => <li key={r.id}><Badge tone={r.status === "open" ? "danger" : "neutral"}>{r.status}</Badge> {r.reason}: {r.description ?? "—"} <span className="text-xs text-muted num">{formatDate(r.createdAt)}</span></li>)}</ul> : <p className="text-sm text-muted">No reports.</p>}
          </section>
        </div>
      </div>
      <h2 className="adm-section">Status history</h2>
      <Table>
        <thead><tr><Th>When</Th><Th>From</Th><Th>To</Th><Th>By</Th><Th>Reason</Th></tr></thead>
        <tbody>{d.history.length ? d.history.map(({ h, actor }) => <tr key={h.id}><Td className="num">{formatDateTime(h.createdAt)}</Td><Td>{h.previousStatus ?? "—"}</Td><Td>{h.newStatus}</Td><Td>{actor?.name ?? "system"}</Td><Td>{h.reason ?? "—"}</Td></tr>) : <EmptyRow colSpan={5}>No history.</EmptyRow>}</tbody>
      </Table>
    </div>
  );
}
