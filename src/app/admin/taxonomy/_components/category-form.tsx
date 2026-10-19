import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, categoryAttributes, categoryUnits } from "@/db/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { saveCategoryAction } from "../actions";
import { AttributePicker, UnitPicker, UnitSelect } from "./attr-unit-pickers";
import { Cb, F, Grid, LISTING_KIND_OPTIONS, MODERATION_OPTIONS, Sel, TA } from "./fields";

type Category = typeof categories.$inferSelect;

export async function CategoryForm({ category, parentId }: { category?: Category; parentId?: string | null }) {
  const all = await db.select({ id: categories.id, nameEn: categories.nameEn, parentId: categories.parentId, status: categories.status }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  const label = (id: string): string => {
    const c = all.find((x) => x.id === id);
    if (!c) return "";
    return c.parentId ? `${label(c.parentId)} › ${c.nameEn}` : c.nameEn;
  };
  const attrLinks = category ? await db.select().from(categoryAttributes).where(eq(categoryAttributes.categoryId, category.id)) : [];
  const unitLinks = category ? await db.select().from(categoryUnits).where(eq(categoryUnits.categoryId, category.id)) : [];
  const selectedAttrs = new Map(attrLinks.map((a) => [a.attributeId, { isRequired: a.isRequired, displayOrder: a.displayOrder }]));
  const selectedUnits = new Set(unitLinks.map((u) => u.unitId));
  const defaultUnit = unitLinks.find((u) => u.isDefault)?.unitId ?? null;

  return (
    <form action={saveCategoryAction} encType="multipart/form-data" className="space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="card space-y-4 p-4">
        <Grid>
          <F label="Name (English)" name="nameEn" value={category?.nameEn} required />
          <F label="Name (Urdu)" name="nameUr" value={category?.nameUr} dir="rtl" />
          <F label="Slug" name="slug" value={category?.slug} help="Leave blank to generate from the name. Changing it creates a redirect from the old URL." placeholder="auto" />
          <F label="Roman Urdu aliases" name="aliasesRoman" value={category?.aliasesRoman?.join(", ")} help="Comma separated, e.g. anaj, ghalla" />
          <Sel
            label="Parent category"
            name="parentId"
            value={category?.parentId ?? parentId ?? ""}
            allowEmpty="— top level —"
            options={all.filter((c) => c.id !== category?.id && c.status !== "merged").map((c) => ({ value: c.id, label: label(c.id) }))}
          />
          <F label="Icon (emoji or short text)" name="icon" value={category?.icon} help="Always shown next to a text label." />
        </Grid>
        <Grid>
          <TA label="Description (English)" name="description" value={category?.description} />
          <TA label="Description (Urdu)" name="descriptionUr" value={category?.descriptionUr} dir="rtl" />
        </Grid>
        <Grid cols={3}>
          <Sel label="Listing kind" name="listingKind" value={category?.listingKind ?? "commodity"} options={LISTING_KIND_OPTIONS} />
          <Sel label="Moderation level" name="moderationLevel" value={category?.moderationLevel ?? "review"} options={MODERATION_OPTIONS} />
          <UnitSelect name="defaultUnitId" value={category?.defaultUnitId ?? null} />
        </Grid>
        <Grid cols={3}>
          <Cb label="Supports grades / specifications" name="supportsGrades" checked={category?.supportsGrades ?? true} />
          <Cb label="Supports price benchmark" name="supportsPriceBenchmark" checked={category?.supportsPriceBenchmark ?? true} />
          <Cb label="Featured on homepage" name="isFeatured" checked={category?.isFeatured ?? false} />
        </Grid>
        <Grid cols={3}>
          <Sel label="Status" name="status" value={category?.status ?? "active"} options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive (hidden; listings preserved)" }]} />
          <F label="Sort order" name="sortOrder" type="number" value={category?.sortOrder ?? 0} />
          <label className="block">
            <span className="block text-sm font-semibold">Image</span>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" />
            {category?.imagePath && (
              <span className="mt-1 flex items-center gap-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/files/public/${category.imagePath}`} alt="" className="h-10 w-10 rounded object-cover" />
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="removeImage" /> remove
                </label>
              </span>
            )}
          </label>
        </Grid>
      </div>
      <div className="card space-y-4 p-4">
        <h2 className="font-bold">SEO</h2>
        <F label="SEO title" name="seoTitle" value={category?.seoTitle} help="Default: “{Name} Suppliers and Market Rates in Pakistan”" />
        <TA label="Meta description" name="seoDescription" value={category?.seoDescription} rows={2} />
      </div>
      <AttributePicker selected={selectedAttrs} />
      <UnitPicker selected={selectedUnits} defaultUnitId={defaultUnit} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{category ? "Save category" : "Create category"}</Button>
        <Link href="/admin/taxonomy" className={buttonClass("outline")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
