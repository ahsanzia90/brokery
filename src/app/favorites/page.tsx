import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getFavorites } from "@/lib/favorites/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/section";
import { ListingCard, SupplierCard } from "@/components/marketplace/cards";

export const metadata: Metadata = { title: "Saved items", ...NOINDEX };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const user = await requireUserPage("/favorites");
  const { t, locale } = await getT();
  const favRaw = await getFavorites(user.id, locale);
  const favs = { ...favRaw, counts: { listings: favRaw.listings.length, suppliers: favRaw.suppliers.length, commodities: favRaw.commodities.length } };
  const active = tab === "suppliers" || tab === "commodities" ? tab : "listings";
  const tabs = [
    { key: "listings", label: t("fav.listings"), count: favs.counts.listings },
    { key: "suppliers", label: t("fav.suppliers"), count: favs.counts.suppliers },
    { key: "commodities", label: t("fav.commodities"), count: favs.counts.commodities },
  ];
  const total = favs.counts.listings + favs.counts.suppliers + favs.counts.commodities;
  return (
    <div className="container-page max-w-5xl py-6">
      <PageHeader title={t("fav.title")}>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {tabs.map((tb) => (
            <Link key={tb.key} role="tab" aria-selected={active === tb.key} href={`/favorites?tab=${tb.key}`} className={`min-h-[44px] rounded-full border px-4 py-2 font-semibold ${active === tb.key ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
              {tb.label} <span className="num">({tb.count})</span>
            </Link>
          ))}
        </div>
      </PageHeader>
      {total === 0 ? (
        <EmptyState icon="⭐" title={t("fav.empty")} action={<><LinkButton href="/listings" variant="outline">{t("home.listings.all")}</LinkButton><LinkButton href="/suppliers" variant="outline">{t("home.suppliers.all")}</LinkButton></>} />
      ) : active === "listings" ? (
        favs.listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favs.listings.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState icon="📦" title={t("empty.generic")} action={<LinkButton href="/listings" variant="outline">{t("home.listings.all")}</LinkButton>} />
        )
      ) : active === "suppliers" ? (
        favs.suppliers.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favs.suppliers.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState icon="🏪" title={t("empty.generic")} action={<LinkButton href="/suppliers" variant="outline">{t("home.suppliers.all")}</LinkButton>} />
        )
      ) : favs.commodities.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favs.commodities.map((c) => (
            <li key={c.id} className="card p-4">
              <Link href={`/commodities/${c.slug}`} className="text-lg font-bold hover:text-primary">
                {c.name}
              </Link>
              <div className="mt-2 flex gap-3 text-sm">
                <Link href={`/prices/${c.slug}`} className="text-primary underline">{t("nav.prices")}</Link>
                <Link href={`/rfq/new?commodity=${c.slug}`} className="text-primary underline">{t("action.requestQuote")}</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🌾" title={t("empty.generic")} action={<LinkButton href="/categories" variant="outline">{t("home.categories.all")}</LinkButton>} />
      )}
    </div>
  );
}
