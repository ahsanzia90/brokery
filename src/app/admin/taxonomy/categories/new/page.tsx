import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { CategoryForm } from "../../_components/category-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New category" breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "New category" }]} />
      <Flash error={str(sp, "error")} />
      <CategoryForm parentId={str(sp, "parent") || null} />
    </div>
  );
}
