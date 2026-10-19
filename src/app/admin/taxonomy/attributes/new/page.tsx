import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { AttributeForm } from "../../_components/attribute-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewAttributePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New attribute" breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Attributes", href: "/admin/taxonomy/attributes" }, { label: "New" }]} />
      <Flash error={str(sp, "error")} />
      <AttributeForm />
    </div>
  );
}
