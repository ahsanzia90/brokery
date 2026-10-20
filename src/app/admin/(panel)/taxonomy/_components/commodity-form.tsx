import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, categoryAttributes, categoryUnits, commodities } from "@/db/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { saveCommodityAction } from "../actions";
import { AttributePicker, UnitPicker, UnitSelect } from "./attr-unit-pickers";
import { Cb, F, Grid, LISTING_KIND_OPTIONS, MODERATION_OPTIONS, Sel, TA } from "./fields";

type Commodity = typeof commodities.$inferSelect;

export async function CommodityForm({ commodity, categoryId }: { commodity?: Commodity; categoryId?: string | null }) {
  const cats = await db.select({ id: categories.id, nameEn: categories.nameEn, parentId: categories.parentId, status: categories.status }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  const label = (id: string): string => {
    const c = cats.find((x) => x.id === id);
    if (!c) return "";
    return c.parentId ? `${label(c.parentId)} › ${c.nameEn}` : c.nameEn;
  };
  const attrLinks = commodity ? await db.select().from(categoryAttributes).where(eq(categoryAttributes.commodityId, commodity.id)) : [];
  const unitLinks = commodity ? await db.select().from(categoryUnits).where(eq(categoryUnits.commodityId, commodity.id)) : [];
  const selectedAttrs = new Map(attrLinks.map((a) => [a.attributeId, { isRequired: a.isRequired, displayOrder: a.displayOrder }]));
  const selectedUnits = new Set(unitLinks.map((u) => u.unitId));
  const defaultUnit = unitLinks.find((u) => u.isDefault)?.unitId ?? null;

  return (
    <form action={saveCommodityAction} encType="multipart/form-data" className="space-y-5">
      {commodity && <input type="hidden" name="id" value={commodity.id} />}
      <div className="card space-y-4 p-4">
        <Grid>
          <F label="Name (English)" name="nameEn" value={commodity?.nameEn} required />
          <F label="Name (Urdu)" name="nameUr" value={commodity?.nameUr} dir="rtl" />
          <F label="Slug" name="slug" value={commodity?.slug} help="Blank = generate from name. Changing it redirects /commodities/<old> and /prices/<old>." placeholder="auto" />
          <Sel label="Category" name="categoryId" value={commodity?.categoryId ?? categoryId ?? ""} allowEmpty="Select…" options={cats.filter((c) => c.status !== "merged").map((c) => ({ value: c.id, label: label(c.id) }))} />
        </Grid>
        <Grid>
          <TA label="Description (English)" name="description" value={commodity?.description} />
          <TA label="Description (Urdu)" name="descriptionUr" value={commodity?.descriptionUr} dir="rtl" />
        </Grid>
        <Grid cols={3}>
          <Sel label="Listing kind override" name="listingKind" value={commodity?.listingKind ?? ""} allowEmpty="inherit from category" options={LISTING_KIND_OPTIONS} />
          <Sel label="Moderation override" name="moderationLevel" value={commodity?.moderationLevel ?? ""} allowEmpty="inherit from category" options={MODERATION_OPTIONS} />
          <UnitSelect name="defaultUnitId" value={commodity?.defaultUnitId ?? null} />
        </Grid>
        <Grid cols={3}>
          <Cb label="Has types / varieties" name="supportsVarieties" checked={commodity?.supportsVarieties ?? true} />
          <Cb label="Has grades / specifications" name="supportsGrades" checked={commodity?.supportsGrades ?? true} />
          <Cb label="Supports price benchmark" name="supportsPriceBenchmark" checked={commodity?.supportsPriceBenchmark ?? true} />
        </Grid>
        <Grid cols={3}>
          <Sel label="Status" name="status" value={commodity?.status ?? "active"} options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive (hidden; listings preserved)" }]} />
          <Cb label="Popular (shown on homepage chips)" name="isPopular" checked={commodity?.isPopular ?? false} />
          <F label="Sort order" name="sortOrder" type="number" value={commodity?.sortOrder ?? 0} />
        </Grid>
        <label className="block">
          <span className="block text-sm font-semibold">Image</span>
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" />
          {commodity?.imagePath && (
            <span className="mt-1 flex items-center gap-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/files/public/${commodity.imagePath}`} alt="" className="h-10 w-10 rounded object-cover" />
              <label className="flex items-center gap-1">
                <input type="checkbox" name="removeImage" /> remove
              </label>
            </span>
          )}
        </label>
      </div>
      <div className="card space-y-4 p-4">
        <h2 className="font-bold">SEO</h2>
        <F label="SEO title" name="seoTitle" value={commodity?.seoTitle} help="Default: “{Name} Suppliers and Market Rates in Pakistan”" />
        <TA label="Meta description" name="seoDescription" value={commodity?.seoDescription} rows={2} />
      </div>
      <AttributePicker selected={selectedAttrs} overrideToggle defaultOverride={attrLinks.length > 0} />
      <UnitPicker selected={selectedUnits} defaultUnitId={defaultUnit} overrideToggle defaultOverride={unitLinks.length > 0} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{commodity ? "Save commodity" : "Create commodity"}</Button>
        <Link href="/admin/taxonomy" className={buttonClass("outline")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
