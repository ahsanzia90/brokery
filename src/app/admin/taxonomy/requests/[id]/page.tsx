import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, commodityGrades, commodityVarieties, listings, profiles, taxonomyRequests } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { resolveRequestAction } from "../../actions";
import { F, Sel, TA } from "../../_components/fields";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

export default async function RequestDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [r] = await db.select().from(taxonomyRequests).where(eq(taxonomyRequests.id, id));
  if (!r) notFound();
  const [requester] = r.requestedBy ? await db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, r.requestedBy)) : [];
  const [reviewer] = r.reviewerId ? await db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, r.reviewerId)) : [];
  const commodityRows = await db.select({ id: commodities.id, nameEn: commodities.nameEn, slug: commodities.slug }).from(commodities).where(eq(commodities.status, "active")).orderBy(asc(commodities.nameEn));
  const categoryRows = await db.select({ id: categories.id, nameEn: categories.nameEn }).from(categories).where(eq(categories.status, "active")).orderBy(asc(categories.nameEn));
  const varietyRows = r.commodityId ? await db.select().from(commodityVarieties).where(eq(commodityVarieties.commodityId, r.commodityId)).orderBy(asc(commodityVarieties.nameEn)) : [];
  const gradeRows = r.commodityId ? await db.select().from(commodityGrades).where(eq(commodityGrades.commodityId, r.commodityId)).orderBy(asc(commodityGrades.nameEn)) : [];
  const listingId = (r.metadata as { listingId?: string } | null)?.listingId;
  const [listing] = listingId ? await db.select({ id: listings.id, title: listings.title, slug: listings.slug }).from(listings).where(eq(listings.id, listingId)) : [];
  const commodityName = commodityRows.find((c) => c.id === r.commodityId)?.nameEn;
  const mergeOptions = r.requestType === "variety" ? varietyRows.map((v) => ({ value: v.id, label: v.nameEn })) : r.requestType === "grade" ? gradeRows.map((g) => ({ value: g.id, label: g.nameEn })) : r.requestType === "commodity" || r.requestType === "alias" ? commodityRows.map((c) => ({ value: c.id, label: c.nameEn })) : categoryRows.map((c) => ({ value: c.id, label: c.nameEn }));

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={`Request: ${r.proposedName}`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Requests", href: "/admin/taxonomy/requests" }, { label: r.proposedName }]} />
      <Flash error={str(sp, "error")} />
      <div className="card mb-4 space-y-1 p-4 text-sm">
        <p><Badge tone="info">{r.requestType}</Badge> <Badge tone={r.status === "pending" ? "warning" : r.status === "rejected" ? "danger" : "success"}>{r.status}</Badge></p>
        <p>Proposed: <strong>{r.proposedName}</strong> {r.proposedNameUr && <span lang="ur">({r.proposedNameUr})</span>}</p>
        {commodityName && <p>For commodity: {commodityName}</p>}
        {r.region && <p>Region: {r.region}</p>}
        {r.notes && <p>Notes: {r.notes}</p>}
        <p className="text-muted">Submitted {formatDateTime(r.createdAt)} by {requester?.name || "guest"}</p>
        {listing && <p>Triggered by listing: <Link href={`/listings/${listing.slug}`} className="text-primary underline" target="_blank">{listing.title}</Link> (will be linked automatically on approval)</p>}
        {r.status !== "pending" && <p className="text-muted">Reviewed by {reviewer?.name ?? "—"}: {r.reviewNotes ?? "no notes"}</p>}
      </div>
      {r.status === "pending" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <form action={resolveRequestAction} className="card space-y-3 p-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="action" value="approve" />
            <h2 className="font-bold">Approve → create entry</h2>
            <F label="Name (English)" name="nameEn" value={r.proposedName} required />
            <F label="Name (Urdu)" name="nameUr" value={r.proposedNameUr} dir="rtl" />
            {(r.requestType === "variety" || r.requestType === "grade" || r.requestType === "alias") && <Sel label="Commodity" name="commodityId" value={r.commodityId ?? ""} allowEmpty="Select…" options={commodityRows.map((c) => ({ value: c.id, label: c.nameEn }))} />}
            {(r.requestType === "grade" || r.requestType === "alias") && varietyRows.length > 0 && <Sel label="Variety (optional)" name="varietyId" value="" allowEmpty="whole commodity" options={varietyRows.map((v) => ({ value: v.id, label: v.nameEn }))} />}
            {r.requestType === "alias" && <Sel label="Language" name="language" value="ur_roman" options={[{ value: "ur_roman", label: "Roman Urdu" }, { value: "ur", label: "Urdu" }, { value: "en", label: "English" }, { value: "other", label: "Other / regional" }]} />}
            {(r.requestType === "commodity" || r.requestType === "category") && <Sel label={r.requestType === "commodity" ? "Category" : "Parent category"} name="categoryId" value={r.categoryId ?? ""} allowEmpty={r.requestType === "commodity" ? "Select…" : "— top level —"} options={categoryRows.map((c) => ({ value: c.id, label: c.nameEn }))} />}
            <TA label="Review notes" name="notes" rows={2} />
            <Button type="submit">Approve &amp; create</Button>
          </form>
          <div className="space-y-4">
            <form action={resolveRequestAction} className="card space-y-3 p-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="action" value="merge" />
              <h2 className="font-bold">Already exists → merge</h2>
              <Sel label="Existing entry" name="resolvedEntityId" value="" allowEmpty="Select…" options={mergeOptions} />
              <TA label="Notes" name="notes" rows={2} />
              <Button type="submit" variant="secondary">Mark as duplicate</Button>
            </form>
            <form action={resolveRequestAction} className="card space-y-3 p-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="action" value="reject" />
              <h2 className="font-bold">Reject</h2>
              <TA label="Reason (required)" name="notes" rows={2} />
              <Button type="submit" variant="danger">Reject</Button>
            </form>
          </div>
        </div>
      ) : (
        <Alert tone="info">
          This request has been resolved.{" "}
          <Link href="/admin/taxonomy/requests" className={buttonClass("outline", "sm")}>Back to queue</Link>
        </Alert>
      )}
    </div>
  );
}
