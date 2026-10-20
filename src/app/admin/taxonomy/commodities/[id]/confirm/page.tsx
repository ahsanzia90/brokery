import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { commodities } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { commodityImpact } from "@/lib/admin/taxonomy-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { mergeCommodityAction, setCommodityStatusAction } from "../../../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function ConfirmCommodityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const action = str(sp, "action", "inactive");
  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, id));
  if (!commodity) notFound();
  const impact = await commodityImpact(id);
  const isSuper = user.roles.includes("super_admin");
  const targets = action === "merge" ? await db.select().from(commodities).where(and(eq(commodities.status, "active"), ne(commodities.id, id))).orderBy(asc(commodities.nameEn)) : [];
  return (
    <div className="max-w-2xl">
      <AdminPageHeader title={`${action === "merge" ? "Merge" : action === "active" ? "Reactivate" : "Deactivate"} “${commodity.nameEn}”`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: commodity.nameEn, href: `/admin/taxonomy/commodities/${id}/edit` }, { label: "Confirm" }]} />
      <Flash error={str(sp, "error")} />
      <Alert tone="info" title="Preview of affected data" className="mb-4">
        <ul className="mt-1 list-disc ps-5 text-sm">
          <li>{impact.varieties} varieties</li>
          <li>{impact.listings} listings (kept)</li>
          <li>{impact.prices} price records</li>
          <li>{impact.rfqs} buying requests</li>
          <li>{impact.businesses} suppliers declare this commodity</li>
        </ul>
        <p className="mt-2 text-sm">
          {action === "merge"
            ? "Merging moves all of the above to the target commodity (varieties/grades with the same slug are mapped onto the target’s), marks this one as merged, and adds 301 redirects for /commodities and /prices URLs."
            : action === "active"
              ? "Reactivating makes the commodity visible again in search, forms and public pages."
              : "Deactivating hides it from search, forms and navigation. Existing listings and prices are preserved."}
        </p>
      </Alert>
      {action === "merge" ? (
        isSuper ? (
          <form action={mergeCommodityAction} className="card space-y-4 p-4">
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="font-semibold">Merge into</span>
              <select name="targetId" required defaultValue={str(sp, "target")} className="adm-control mt-1 w-full">
                <option value="">Select target commodity…</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameEn} (/{t.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold">Reason (recorded in audit log)</span>
              <textarea name="reason" required rows={2} className="adm-control mt-1 w-full" />
            </label>
            <div className="flex gap-3">
              <Button type="submit" variant="danger">
                Merge now
              </Button>
              <Link href={`/admin/taxonomy/commodities/${id}/edit`} className={buttonClass("outline")}>
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <Alert tone="warning">Merging requires a super admin.</Alert>
        )
      ) : (
        <form action={setCommodityStatusAction} className="card space-y-4 p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={action === "active" ? "active" : "inactive"} />
          <label className="block">
            <span className="font-semibold">Reason (optional)</span>
            <input name="reason" className="adm-control mt-1 w-full" />
          </label>
          <div className="flex gap-3">
            <Button type="submit" variant={action === "active" ? "primary" : "danger"}>
              {action === "active" ? "Reactivate" : "Deactivate"}
            </Button>
            <Link href={`/admin/taxonomy/commodities/${id}/edit`} className={buttonClass("outline")}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
