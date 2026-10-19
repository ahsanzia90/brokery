import { NextResponse } from "next/server";
import { getAllLocations } from "@/lib/data/locations";

export const dynamic = "force-dynamic";

/** GET ?type=province|district|city|market&parent=<id> → { items: [{id, type, slug, nameEn, nameUr, parentId, isMajorMarket}] } */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const parent = sp.get("parent");
  const all = await getAllLocations();
  const byId = new Map(all.map((l) => [l.id, l]));
  let items = all;
  if (type) items = items.filter((l) => l.type === type);
  if (parent) {
    // Cities under a province: walk through districts.
    items = items.filter((l) => {
      let cur = l.parentId ? byId.get(l.parentId) : undefined;
      let guard = 0;
      while (cur && guard++ < 4) {
        if (cur.id === parent) return true;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return false;
    });
  }
  return NextResponse.json(
    { items: items.map((l) => ({ id: l.id, type: l.type, slug: l.slug, nameEn: l.nameEn, nameUr: l.nameUr, parentId: l.parentId, isMajorMarket: l.isMajorMarket })) },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
