import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { buttonClass } from "@/components/ui/button";
import { CategoryForm } from "../../../_components/category-form";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) notFound();
  return (
    <div>
      <AdminPageHeader
        title={`Edit: ${category.nameEn}`}
        breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: category.nameEn }]}
        actions={
          <>
            <Link href={`/categories/${category.slug}`} target="_blank" className={buttonClass("outline", "sm")}>
              View public page ↗
            </Link>
            <Link href={`/admin/taxonomy/commodities/new?category=${category.id}`} className={buttonClass("secondary", "sm")}>
              + Commodity here
            </Link>
            <Link href={`/admin/taxonomy/categories/${category.id}/confirm?action=merge`} className={buttonClass("ghost", "sm")}>
              Merge into…
            </Link>
          </>
        }
      />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      {category.status === "merged" && <p className="mb-4 rounded border border-warning bg-warning-soft p-3">This category was merged into another and is no longer shown publicly.</p>}
      <CategoryForm category={category} />
    </div>
  );
}
