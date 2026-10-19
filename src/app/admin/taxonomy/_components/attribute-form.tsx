import Link from "next/link";
import type { attributeDefinitions } from "@/db/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { saveAttributeAction } from "../actions";
import { Cb, F, Grid, Sel, TA } from "./fields";

export function AttributeForm({ attr }: { attr?: typeof attributeDefinitions.$inferSelect }) {
  return (
    <form action={saveAttributeAction} className="card max-w-3xl space-y-4 p-4">
      {attr && <input type="hidden" name="id" value={attr.id} />}
      <Grid>
        <F label="Key" name="key" value={attr?.key} required help="lowercase_with_underscores; used in CSV import and filters" />
        <Sel label="Type" name="type" value={attr?.type ?? "text"} options={["text", "number", "select", "multiselect", "boolean", "date"].map((v) => ({ value: v, label: v }))} />
        <F label="Name (English)" name="nameEn" value={attr?.nameEn} required />
        <F label="Name (Urdu)" name="nameUr" value={attr?.nameUr} dir="rtl" />
        <F label="Unit label" name="unitLabel" value={attr?.unitLabel} help="Display suffix, e.g. %, mm, GSM" />
        <Cb label="Filterable in search" name="isFilterable" checked={attr?.isFilterable} help="Only enable for fields buyers genuinely filter by." />
        <F label="Minimum value" name="minValue" type="number" value={attr?.minValue} />
        <F label="Maximum value" name="maxValue" type="number" value={attr?.maxValue} />
      </Grid>
      <TA label="Allowed values (select / multiselect)" name="allowedValues" value={attr?.allowedValues?.join("\n")} rows={4} help="One per line" />
      <TA label="Help text shown to sellers" name="helpText" value={attr?.helpText} rows={2} />
      <div className="flex gap-3">
        <Button type="submit">{attr ? "Save attribute" : "Create attribute"}</Button>
        <Link href="/admin/taxonomy/attributes" className={buttonClass("outline")}>Cancel</Link>
      </div>
    </form>
  );
}
