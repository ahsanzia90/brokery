import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { ContentForm } from "../_components/content-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function NewContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("content.manage");
  const sp = await searchParams;
  return (
    <div>
      <AdminPageHeader title="New content" breadcrumbs={[{ label: "Pages & guides", href: "/admin/content" }, { label: "New" }]} />
      <Flash error={str(sp, "error")} />
      <ContentForm kind={str(sp, "kind") || "page"} />
    </div>
  );
}
