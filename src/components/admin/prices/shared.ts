import "server-only";
import { getAllLocations } from "@/lib/data/locations";
import { getPriceSources } from "@/lib/prices/queries";

/** Cities (grouped by province) and markets (grouped under "Markets") for the price form. */
export async function locationGroupsForForm(): Promise<Array<{ group: string; items: Array<{ id: string; label: string }> }>> {
  const all = await getAllLocations();
  const byId = new Map(all.map((l) => [l.id, l]));
  const provinceOf = (id: string | null): string => {
    let cur = id ? byId.get(id) : undefined;
    let guard = 0;
    while (cur && guard++ < 6) {
      if (cur.type === "province") return cur.nameEn;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return "Other";
  };
  const groups = new Map<string, Array<{ id: string; label: string }>>();
  for (const l of all.filter((x) => x.type === "city").sort((a, b) => Number(b.isMajorMarket) - Number(a.isMajorMarket) || a.nameEn.localeCompare(b.nameEn))) {
    const g = provinceOf(l.parentId);
    groups.set(g, [...(groups.get(g) ?? []), { id: l.id, label: l.nameEn }]);
  }
  const markets = all.filter((x) => x.type === "market").map((m) => ({ id: m.id, label: `${m.nameEn} (${byId.get(m.parentId ?? "")?.nameEn ?? ""})` }));
  const out = [...groups.entries()].map(([group, items]) => ({ group, items }));
  if (markets.length) out.push({ group: "Markets / mandis", items: markets });
  return out;
}

export async function sourceOptions() {
  return (await getPriceSources(true)).map((s) => ({ id: s.id, label: s.name }));
}
