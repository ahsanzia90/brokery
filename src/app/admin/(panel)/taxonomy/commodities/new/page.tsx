import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { CommodityForm } from "../../_components/commodity-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewCommodityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New commodity" description="Varieties, grades and aliases can be added after the commodity is created." breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "New commodity" }]} />
      <Flash error={str(sp, "error")} />
      <CommodityForm categoryId={str(sp, "category") || null} />
    </div>
  );
}
