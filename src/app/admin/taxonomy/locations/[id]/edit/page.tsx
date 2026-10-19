import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { LocationForm } from "../../../_components/location-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditLocationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [loc] = await db.select().from(locations).where(eq(locations.id, id));
  if (!loc) notFound();
  return (
    <div>
      <AdminPageHeader title={`Edit location: ${loc.nameEn}`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Locations", href: "/admin/taxonomy/locations" }, { label: loc.nameEn }]} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <LocationForm loc={loc} />
    </div>
  );
}
