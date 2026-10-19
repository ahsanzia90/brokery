import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { UnitForm } from "../../_components/unit-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewUnitPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New unit" breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Units", href: "/admin/taxonomy/units" }, { label: "New" }]} />
      <Flash error={str(sp, "error")} />
      <UnitForm />
    </div>
  );
}
