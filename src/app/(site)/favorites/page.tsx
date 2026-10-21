import { CommodityVisual } from "@/components/marketplace/commodity-visual";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getFavorites } from "@/lib/favorites/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ListingCard, SupplierCard } from "@/components/marketplace/cards";
import { artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { DashHeader, SegmentedTabs } from "@/components/flows/dashboard-shell";
import { WithDashboardShell } from "@/components/flows/shell-page";

export const metadata: Metadata = { title: "Saved items", ...NOINDEX };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const user = await requireUserPage("/favorites");
  const { t, locale } = await getT();
  const favs = await getFavorites(user.id, locale);
  const counts = { listings: favs.listings.length, suppliers: favs.suppliers.length, commodities: favs.commodities.length };
  const active = tab === "suppliers" || tab === "commodities" ? tab : "listings";
  const total = counts.listings + counts.suppliers + counts.commodities;
  return (
    <WithDashboardShell user={user} t={t}>
      <DashHeader title={t("fav.title")} />
      <SegmentedTabs
        current={active}
        tabs={[
          { key: "listings", label: t("fav.listings"), count: counts.listings, href: "/favorites?tab=listings" },
          { key: "suppliers", label: t("fav.suppliers"), count: counts.suppliers, href: "/favorites?tab=suppliers" },
          { key: "commodities", label: t("fav.commodities"), count: counts.commodities, href: "/favorites?tab=commodities" },
        ]}
      />
      {total === 0 ? (
        <EmptyState icon={<Heart className="h-5 w-5" />} title={t("fav.empty")} action={<><LinkButton href="/listings" variant="outline" size="sm">{t("home.listings.all")}</LinkButton><LinkButton href="/suppliers" variant="outline" size="sm">{t("home.suppliers.all")}</LinkButton></>} />
      ) : active === "listings" ? (
        favs.listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favs.listings.map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState compact title={t("empty.generic")} action={<LinkButton href="/listings" variant="outline" size="sm">{t("home.listings.all")}</LinkButton>} />
        )
      ) : active === "suppliers" ? (
        favs.suppliers.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {favs.suppliers.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState compact title={t("empty.generic")} action={<LinkButton href="/suppliers" variant="outline" size="sm">{t("home.suppliers.all")}</LinkButton>} />
        )
      ) : favs.commodities.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {favs.commodities.map((c) => {
            const k = artKeyFor(c.slug, c.name);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-[var(--r-md)] border border-line bg-surface p-3">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${artTint[k]}`}>
                  <CommodityVisual artKey={k} className="h-10 w-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/commodities/${c.slug}`} className="block truncate text-[16px] font-bold text-ink hover:text-brand-800">
                    {c.name}
                  </Link>
                  <span className="mt-1 flex gap-3 text-[13px] font-semibold">
                    <Link href={`/prices/${c.slug}`} className="text-brand-800 hover:underline">{t("nav.prices")}</Link>
                    <Link href={`/rfq/new?commodity=${c.slug}`} className="text-brand-800 hover:underline">{t("action.requestQuote")}</Link>
                  </span>
                </span>
                <Link href={`/commodities/${c.slug}`} aria-label={c.name} className="text-muted-2"><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact title={t("empty.generic")} action={<LinkButton href="/categories" variant="outline" size="sm">{t("home.categories.all")}</LinkButton>} />
      )}
    </WithDashboardShell>
  );
}
