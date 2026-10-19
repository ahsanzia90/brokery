import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { categoryImpact, descendantCategoryIds } from "@/lib/admin/taxonomy-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { mergeCategoryAction, setCategoryStatusAction } from "../../../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function ConfirmCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const action = str(sp, "action", "inactive");
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) notFound();
  const impact = await categoryImpact(id);
  const isSuper = user.roles.includes("super_admin");
  const excluded = new Set([id, ...(await descendantCategoryIds(id))]);
  const targets = action === "merge" ? (await db.select().from(categories).where(eq(categories.status, "active")).orderBy(asc(categories.nameEn))).filter((c) => !excluded.has(c.id)) : [];

  return (
    <div className="max-w-2xl">
      <AdminPageHeader title={action === "merge" ? `Merge “${category.nameEn}”` : action === "active" ? `Reactivate “${category.nameEn}”` : `Deactivate “${category.nameEn}”`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: category.nameEn, href: `/admin/taxonomy/categories/${id}/edit` }, { label: "Confirm" }]} />
      <Flash error={str(sp, "error")} />
      <Alert tone="info" title="Preview of affected data" className="mb-4">
        <ul className="mt-1 list-disc ps-5 text-sm">
          <li>{impact.subcategories} subcategories</li>
          <li>{impact.commodities} commodities</li>
          <li>{impact.listings} listings (kept; never deleted)</li>
          <li>{impact.prices} price records</li>
          <li>{impact.rfqs} buying requests</li>
        </ul>
        <p className="mt-2 text-sm">
          {action === "merge"
            ? "Merging moves commodities and subcategories to the target, marks this category as merged and adds a 301 redirect from the old URL. Listings keep their IDs."
            : action === "active"
              ? "Reactivating makes the category and its public pages visible again."
              : "Deactivating hides the category from navigation and search. Listings, prices and requests stay intact and can be reactivated later."}
        </p>
      </Alert>
      {action === "merge" ? (
        isSuper ? (
          <form action={mergeCategoryAction} className="card space-y-4 p-4">
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="font-semibold">Merge into</span>
              <select name="targetId" required defaultValue={str(sp, "target")} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2">
                <option value="">Select target category…</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameEn} (/{t.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold">Reason (recorded in audit log)</span>
              <textarea name="reason" required rows={2} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2" />
            </label>
            <div className="flex gap-3">
              <Button type="submit" variant="danger">
                Merge now
              </Button>
              <Link href="/admin/taxonomy" className={buttonClass("outline")}>
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <Alert tone="warning">Merging requires a super admin.</Alert>
        )
      ) : (
        <form action={setCategoryStatusAction} className="card space-y-4 p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={action === "active" ? "active" : "inactive"} />
          <label className="block">
            <span className="font-semibold">Reason (optional, recorded in audit log)</span>
            <input name="reason" className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2" />
          </label>
          <div className="flex gap-3">
            <Button type="submit" variant={action === "active" ? "primary" : "danger"}>
              {action === "active" ? "Reactivate" : "Deactivate"}
            </Button>
            <Link href="/admin/taxonomy" className={buttonClass("outline")}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
