import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, commodities, contentPages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { saveContentAction } from "../actions";
import { CommodityMultiSelect, MarkdownEditor } from "./content-editor";
import { F, Grid, Sel, TA } from "../../taxonomy/_components/fields";

type Content = typeof contentPages.$inferSelect;
const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export async function ContentForm({ content, kind }: { content?: Content; kind?: string }) {
  const related = content?.relatedCommodityIds.length
    ? await db
        .select({ id: commodities.id, nameEn: commodities.nameEn, nameUr: commodities.nameUr, categoryName: categories.nameEn })
        .from(commodities)
        .innerJoin(categories, eq(categories.id, commodities.categoryId))
        .where(inArray(commodities.id, content.relatedCommodityIds))
    : [];
  return (
    <form action={saveContentAction} encType="multipart/form-data" className="space-y-5">
      {content && <input type="hidden" name="id" value={content.id} />}
      {content?.isSystem && <Alert tone="info">🔒 System page: it must stay published and cannot be deleted. You can still edit its content.</Alert>}
      <div className="card space-y-4 p-4">
        <Grid cols={3}>
          <Sel label="Kind" name="kind" value={content?.kind ?? kind ?? "page"} options={[{ value: "page", label: "page (static, at /<slug>)" }, { value: "guide", label: "guide (at /guides/<slug>)" }, { value: "article", label: "article (at /guides/<slug>)" }, { value: "announcement", label: "announcement (site bar)" }, { value: "faq", label: "faq" }]} />
          <F label="Slug" name="slug" value={content?.slug} help="Blank = from title" placeholder="auto" />
          <Sel label="Status" name="status" value={content?.status ?? "draft"} options={[{ value: "draft", label: "draft" }, { value: "published", label: "published" }, { value: "archived", label: "archived" }]} />
        </Grid>
        <Grid>
          <F label="Title (English)" name="titleEn" value={content?.titleEn} required />
          <F label="Title (Urdu)" name="titleUr" value={content?.titleUr} dir="rtl" />
          <TA label="Excerpt (English)" name="excerptEn" value={content?.excerptEn} rows={2} />
          <TA label="Excerpt (Urdu)" name="excerptUr" value={content?.excerptUr} rows={2} dir="rtl" />
        </Grid>
        <Grid cols={3}>
          <F label="Published at" name="publishedAt" type="datetime-local" value={toLocal(content?.publishedAt ?? null)} help="Blank = now when first published" />
          <F label="Schedule publish (draft only)" name="scheduledFor" type="datetime-local" value={toLocal(content?.scheduledFor ?? null)} help="A scheduled job publishes drafts at this time." />
          <label className="block">
            <span className="block text-sm font-semibold">Cover image</span>
            <input type="file" name="coverImage" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" />
            {content?.coverImagePath && (
              <span className="mt-1 flex items-center gap-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/files/public/${content.coverImagePath}`} alt="" className="h-10 w-16 rounded object-cover" />
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="removeCover" /> remove
                </label>
              </span>
            )}
          </label>
        </Grid>
        <div>
          <span className="block text-sm font-semibold">Related commodities</span>
          <CommodityMultiSelect name="relatedCommodityIds" initial={related} />
        </div>
      </div>
      <div className="card p-4">
        <MarkdownEditor name="bodyEn" label="Body (English)" initial={content?.bodyEn ?? ""} />
      </div>
      <div className="card p-4">
        <MarkdownEditor name="bodyUr" label="Body (Urdu)" initial={content?.bodyUr ?? ""} dir="rtl" />
      </div>
      <div className="flex gap-3">
        <Button type="submit">{content ? "Save" : "Create"}</Button>
        <Link href="/admin/content" className={buttonClass("outline")}>Cancel</Link>
      </div>
    </form>
  );
}
