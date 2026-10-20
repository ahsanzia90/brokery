import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { commodities } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { commodityImpact } from "@/lib/admin/taxonomy-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { buttonClass } from "@/components/ui/button";
import { CommodityForm } from "../../../_components/commodity-form";
import { AliasManager, GradeManager, VarietyManager } from "../../../_components/commodity-managers";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditCommodityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [commodity] = await db.select().from(commodities).where(eq(commodities.id, id));
  if (!commodity) notFound();
  const impact = await commodityImpact(id);
  return (
    <div>
      <AdminPageHeader
        title={`Edit: ${commodity.nameEn}`}
        description={`${impact.listings} listings · ${impact.prices} price records · ${impact.rfqs} buying requests · ${impact.businesses} supplier links`}
        breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: commodity.nameEn }]}
        actions={
          <>
            <Link href={`/commodities/${commodity.slug}`} target="_blank" className={buttonClass("outline", "sm")}>
              View public page ↗
            </Link>
            <Link href={`/admin/taxonomy/commodities/${id}/confirm?action=${commodity.status === "active" ? "inactive" : "active"}`} className={buttonClass("ghost", "sm")}>
              {commodity.status === "active" ? "Deactivate…" : "Reactivate…"}
            </Link>
            <Link href={`/admin/taxonomy/commodities/${id}/confirm?action=merge`} className={buttonClass("ghost", "sm")}>
              Merge into…
            </Link>
          </>
        }
      />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      {commodity.status === "merged" && <p className="mb-4 rounded border border-warning bg-warning-soft p-3">This commodity was merged into another. Its listings, prices and requests were moved.</p>}
      <div className="space-y-5">
        <VarietyManager commodityId={id} />
        <GradeManager commodityId={id} />
        <AliasManager commodityId={id} />
        <CommodityForm commodity={commodity} />
      </div>
    </div>
  );
}
