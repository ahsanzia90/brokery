import Link from "next/link";
import { asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { saveLocationAction } from "../actions";
import { Cb, F, Grid, Sel } from "./fields";

export async function LocationForm({ loc, parentId }: { loc?: typeof locations.$inferSelect; parentId?: string | null }) {
  const all = await db.select({ id: locations.id, nameEn: locations.nameEn, type: locations.type, path: locations.path }).from(locations).where(loc ? ne(locations.id, loc.id) : undefined).orderBy(asc(locations.path));
  const parent = all.find((a) => a.id === (loc?.parentId ?? parentId));
  const defaultType = loc?.type ?? (parent?.type === "country" ? "province" : parent?.type === "province" ? "district" : parent?.type === "district" ? "city" : parent?.type === "city" ? "market" : "city");
  return (
    <form action={saveLocationAction} className="card max-w-3xl space-y-4 p-4">
      {loc && <input type="hidden" name="id" value={loc.id} />}
      <Grid>
        <Sel label="Type" name="type" value={defaultType} options={["country", "province", "district", "city", "market"].map((v) => ({ value: v, label: v }))} help="Cities sit under districts (district slugs end in -district); markets under cities." />
        <Sel label="Parent" name="parentId" value={loc?.parentId ?? parentId ?? ""} allowEmpty="— none (country level) —" options={all.filter((a) => a.type !== "market").map((a) => ({ value: a.id, label: `${a.type}: ${a.path}` }))} />
        <F label="Name (English)" name="nameEn" value={loc?.nameEn} required />
        <F label="Name (Urdu)" name="nameUr" value={loc?.nameUr} dir="rtl" />
        <F label="Slug" name="slug" value={loc?.slug} help="Blank = generate from name. Must be unique per type." placeholder="auto" />
        <F label="Roman Urdu / alternate spellings" name="aliasesRoman" value={loc?.aliasesRoman?.join(", ")} help="Comma separated" />
        <F label="Sort order" name="sortOrder" type="number" value={loc?.sortOrder ?? 0} />
        <Sel label="Status" name="status" value={loc?.status ?? "active"} options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }]} />
      </Grid>
      <Cb label="Major market city (shown on homepage and directory chips)" name="isMajorMarket" checked={loc?.isMajorMarket} />
      {loc && <p className="text-sm text-muted">Current path: <code>/{loc.path}</code></p>}
      <div className="flex gap-3">
        <Button type="submit">{loc ? "Save location" : "Create location"}</Button>
        <Link href="/admin/taxonomy/locations" className={buttonClass("outline")}>Cancel</Link>
      </div>
    </form>
  );
}
