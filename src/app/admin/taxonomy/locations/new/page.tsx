import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { LocationForm } from "../../_components/location-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewLocationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New location" breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Locations", href: "/admin/taxonomy/locations" }, { label: "New" }]} />
      <Flash error={str(sp, "error")} />
      <LocationForm parentId={str(sp, "parent") || null} />
    </div>
  );
}
