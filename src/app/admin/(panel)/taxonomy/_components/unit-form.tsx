import Link from "next/link";
import type { units } from "@/db/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { saveUnitAction } from "../actions";
import { F, Grid, Sel, TA } from "./fields";

export function UnitForm({ unit }: { unit?: typeof units.$inferSelect }) {
  return (
    <form action={saveUnitAction} className="card max-w-3xl space-y-4 p-4">
      {unit && <input type="hidden" name="id" value={unit.id} />}
      <Grid>
        <F label="Code" name="code" value={unit?.code} required help="e.g. kg, mt, bag40 — stable identifier used in CSV import" />
        <F label="Symbol" name="symbol" value={unit?.symbol} required help="Shown to users, e.g. kg, 40 kg, bag" />
        <F label="Name (English)" name="nameEn" value={unit?.nameEn} required />
        <F label="Name (Urdu)" name="nameUr" value={unit?.nameUr} dir="rtl" />
        <Sel label="Unit type" name="unitType" value={unit?.unitType ?? "package"} options={["mass", "volume", "count", "length", "area", "package"].map((v) => ({ value: v, label: v }))} />
        <F label="Factor to base unit" name="baseFactor" type="number" value={unit?.baseFactor} help="kg for mass, litre for volume, piece for count. Leave blank for packages with no fixed weight (bag, carton)." />
        <F label="Applicable listing kinds" name="applicableKinds" value={unit?.applicableKinds?.join(", ")} help="Comma separated (commodity, livestock, equipment…). Blank = all." />
        <F label="Sort order" name="sortOrder" type="number" value={unit?.sortOrder ?? 0} />
        <Sel label="Status" name="status" value={unit?.status ?? "active"} options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }]} />
      </Grid>
      <TA label="Conversion note" name="conversionNote" value={unit?.conversionNote} rows={2} help="Shown to users where relevant, e.g. “Maund = 40 kg in most Pakistani markets; confirm with the supplier.”" />
      <div className="flex gap-3">
        <Button type="submit">{unit ? "Save unit" : "Create unit"}</Button>
        <Link href="/admin/taxonomy/units" className={buttonClass("outline")}>Cancel</Link>
      </div>
    </form>
  );
}
