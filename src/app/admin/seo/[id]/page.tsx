import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seoMetadata } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { ConfirmButton } from "@/components/ui/confirm";
import { SeoForm } from "../_components/seo-form";
import { deleteSeoAction, saveSeoAction } from "../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function SeoEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("seo.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [seo] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, id));
  if (!seo) notFound();
  async function remove() {
    "use server";
    const fd = new FormData();
    fd.set("id", id);
    await deleteSeoAction(fd);
  }
  return (
    <div>
      <AdminPageHeader title={`SEO override: ${seo.path ?? `${seo.entityType} ${seo.entityId?.slice(0, 8)}`}`} breadcrumbs={[{ label: "SEO", href: "/admin/seo" }, { label: "Edit" }]} actions={<ConfirmButton title="Remove this override?" body="The page will fall back to its generated metadata." confirmLabel="Remove" cancelLabel="Cancel" onConfirm={remove}>Remove override</ConfirmButton>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <SeoForm seo={seo} action={saveSeoAction} siteUrl={BRAND_DEFAULTS.siteUrl} />
    </div>
  );
}
