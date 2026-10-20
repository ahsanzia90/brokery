import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attributeDefinitions } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { AttributeForm } from "../../../_components/attribute-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditAttributePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [attr] = await db.select().from(attributeDefinitions).where(eq(attributeDefinitions.id, id));
  if (!attr) notFound();
  return (
    <div>
      <AdminPageHeader title={`Edit attribute: ${attr.nameEn}`} breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Attributes", href: "/admin/taxonomy/attributes" }, { label: attr.nameEn }]} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <AttributeForm attr={attr} />
    </div>
  );
}
