import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllLocations } from "@/lib/data/locations";
import { getRfqPrefill } from "@/lib/rfq/queries";
import { PageHeader } from "@/components/ui/section";
import { RfqForm, type CityOption } from "@/components/rfq/rfq-form";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/rfq/new",
    title: "Post a Buying Request (RFQ) — Get Offers from Suppliers",
    description: "Tell suppliers what commodity you need, how much and where. Matching suppliers across Pakistan send you offers; you contact them directly. Free.",
  });
}

export default async function NewRfqPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [{ t, locale }, user, prefill, locations] = await Promise.all([
    getT(),
    getCurrentUser(),
    getRfqPrefill({ commodity: sp.commodity, listing: sp.listing, supplier: sp.supplier }),
    getAllLocations(),
  ]);
  const byId = new Map(locations.map((l) => [l.id, l]));
  const provinceOf = (id: string | null): { id: string; name: string } | null => {
    let cur = id ? byId.get(id) : undefined;
    let guard = 0;
    while (cur && guard++ < 5) {
      if (cur.type === "province") return { id: cur.id, name: locale === "ur" && cur.nameUr ? cur.nameUr : cur.nameEn };
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return null;
  };
  const cities: CityOption[] = locations
    .filter((l) => l.type === "city")
    .map((c) => {
      const p = provinceOf(c.parentId);
      return { id: c.id, name: locale === "ur" && c.nameUr ? c.nameUr : c.nameEn, provinceId: p?.id ?? null, provinceName: p?.name ?? "", isMajor: c.isMajorMarket };
    })
    .sort((a, b) => Number(b.isMajor) - Number(a.isMajor) || a.name.localeCompare(b.name));

  return (
    <div className="container-page max-w-2xl py-6">
      <PageHeader title={t("rfq.title")} subtitle={t("rfq.sub")} />
      <RfqForm prefill={prefill} cities={cities} isAuthenticated={Boolean(user && user.status === "active")} initialQuery={sp.q} restore={sp.restore === "1"} />
    </div>
  );
}
