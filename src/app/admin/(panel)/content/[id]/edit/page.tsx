import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { ConfirmButton } from "@/components/ui/confirm";
import { ContentForm } from "../../_components/content-form";
import { archiveContentAction } from "../../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("content.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [content] = await db.select().from(contentPages).where(eq(contentPages.id, id));
  if (!content) notFound();
  async function archive(reason?: string) {
    "use server";
    const fd = new FormData();
    fd.set("id", id);
    fd.set("reason", reason ?? "");
    await archiveContentAction(fd);
  }
  return (
    <div>
      <AdminPageHeader
        title={`Edit: ${content.titleEn}`}
        breadcrumbs={[{ label: "Pages & guides", href: "/admin/content" }, { label: content.titleEn }]}
        actions={!content.isSystem && content.status !== "archived" ? <ConfirmButton title="Archive this content?" body="It will be removed from the public site. You can republish it later by changing its status." confirmLabel="Archive" cancelLabel="Cancel" requireReason reasonLabel="Reason" onConfirm={archive}>Archive…</ConfirmButton> : undefined}
      />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <ContentForm content={content} />
    </div>
  );
}
