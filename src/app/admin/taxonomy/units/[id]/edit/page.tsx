import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { units } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { UnitForm } from "../../../_components/unit-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditUnitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [unit] = await db.select().from(units).where(eq(units.id, id));
  if (!unit) notFound();
  return (
    <div>
      <AdminPageHeader title={`Edit unit: ${unit.nameEn}`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Units", href: "/admin/taxonomy/units" }, { label: unit.nameEn }]} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <UnitForm unit={unit} />
    </div>
  );
}
