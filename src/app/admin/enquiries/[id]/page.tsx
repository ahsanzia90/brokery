import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { getRfqDetail } from "@/lib/admin/enquiries-service";
import { AdminPageHeader, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { JsonDetails } from "@/components/admin/json-details";
import { Badge, rfqStatusTone, verificationTone } from "@/components/ui/badge";
import { hasPermission } from "@/lib/authz/permissions";
import { formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { closeRfqSpamAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("enquiries.view");
  const { id } = await params;
  const d = await getRfqDetail(id);
  if (!d) notFound();
  const { r, buyer, commodity, unit, city } = d;
  const canModerate = hasPermission(actor.roles, "reports.manage");
  return (
    <div>
      <AdminPageHeader title={`Request ${r.reference}`} breadcrumbs={[{ label: "Enquiries", href: "/admin/enquiries" }, { label: r.reference }]} description={<><Badge tone={rfqStatusTone(r.status)}>{r.status.replace(/_/g, " ")}</Badge> · created <span className="num">{formatDateTime(r.createdAt)}</span>{r.closedReason ? ` · ${r.closedReason}` : ""}</>} actions={canModerate && !["closed", "cancelled"].includes(r.status) ? <ActionButton action={closeRfqSpamAction} payload={{ id }} variant="danger" requireReason confirm={{ title: "Close this request as spam?", body: "The request is cancelled, a resolved spam case is created and the action is audited. The buyer's conversation is not altered." }}>Close as spam</ActionButton> : null} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Request</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-semibold">Buyer</dt><dd className="inline"><Link href={`/admin/users/${buyer.id}`} className="adm-link">{buyer.name}</Link> · <span className="num">{formatPhoneDisplay(buyer.phone)}</span></dd></div>
            <div><dt className="inline font-semibold">Commodity</dt><dd className="inline">{commodity.nameEn}{r.customSpecification ? ` · ${r.customSpecification}` : ""}</dd></div>
            <div><dt className="inline font-semibold">Quantity</dt><dd className="inline num">{formatNumber(r.quantity)} {unit.symbol}</dd></div>
            <div><dt className="inline font-semibold">City</dt><dd className="inline">{city?.nameEn ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Needed by</dt><dd className="inline num">{r.requiredBy ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Target price</dt><dd className="inline num">{r.targetPrice ? formatPKR(r.targetPrice) : "—"}</dd></div>
            <div><dt className="inline font-semibold">Contact preference</dt><dd className="inline">{r.contactPreference}</dd></div>
            <div><dt className="inline font-semibold">Quality</dt><dd className="inline">{r.qualityRequirements ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Notes</dt><dd className="inline whitespace-pre-wrap">{r.notes ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Expires</dt><dd className="inline num">{formatDate(r.expiresAt) || "—"}</dd></div>
          </dl>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Matched suppliers ({d.recipients.length})</h2>
          {d.recipients.length ? <ul className="space-y-1 text-sm">{d.recipients.map(({ rec, biz }) => <li key={rec.id}><Link href={`/admin/businesses/${biz.id}`} className="adm-link">{biz.name}</Link> <Badge tone={verificationTone(biz.verificationLevel)}>{biz.verificationLevel.replace(/_/g, " ")}</Badge> · {rec.state} <span className="text-xs text-muted">({rec.matchReason ?? "—"})</span></li>)}</ul> : <p className="text-sm text-muted">No suppliers matched this request.</p>}
        </section>
      </div>
      <h2 className="adm-section">Offers ({d.quotes.length})</h2>
      <Table>
        <thead><tr><Th>Supplier</Th><Th>Price</Th><Th>Quantity</Th><Th>Valid until</Th><Th>Terms / notes</Th><Th>Status</Th><Th>Sent</Th></tr></thead>
        <tbody>{d.quotes.length ? d.quotes.map(({ q, biz, unit: u }) => <tr key={q.id}><Td><Link href={`/admin/businesses/${biz.id}`} className="adm-link">{biz.name}</Link></Td><Td className="num">{q.priceAmount ? `${formatPKR(q.priceAmount)} / ${u?.symbol ?? "?"}` : "—"}</Td><Td className="num">{q.quantity ? formatNumber(q.quantity) : "—"}</Td><Td className="num">{q.validUntil ?? "—"}</Td><Td>{[q.deliveryTerms, q.notes].filter(Boolean).join(" · ") || "—"}</Td><Td>{q.status}</Td><Td className="num">{formatDateTime(q.createdAt)}</Td></tr>) : <EmptyRow colSpan={7}>No offers yet.</EmptyRow>}</tbody>
      </Table>
      <h2 className="adm-section">Events</h2>
      <Table>
        <thead><tr><Th>When</Th><Th>Event</Th><Th>Actor</Th><Th>Details</Th></tr></thead>
        <tbody>{d.events.length ? d.events.map(({ e, actor: a }) => <tr key={e.id}><Td className="num">{formatDateTime(e.createdAt)}</Td><Td>{e.eventType}</Td><Td>{a?.name ?? "system"}</Td><Td><JsonDetails label="metadata" value={e.metadata} /></Td></tr>) : <EmptyRow colSpan={4}>No events.</EmptyRow>}</tbody>
      </Table>
    </div>
  );
}
