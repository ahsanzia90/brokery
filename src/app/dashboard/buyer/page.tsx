import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getBuyerRfqs, getBuyerRfqStats } from "@/lib/rfq/queries";
import { getFavorites } from "@/lib/favorites/queries";
import { enableSellerAction } from "@/lib/auth/actions";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ListingCard } from "@/components/marketplace/cards";
import { RfqList } from "@/components/rfq/rfq-list";

export const metadata: Metadata = { title: "Buyer dashboard", ...NOINDEX };

export default async function BuyerDashboard() {
  const user = await requireUserPage("/dashboard/buyer");
  const { t, locale } = await getT();
  const [stats, recent, favs] = await Promise.all([getBuyerRfqStats(user.id), getBuyerRfqs(user.id, { status: "all", pageSize: 5 }, locale), getFavorites(user.id, locale).then((f) => ({ ...f, counts: { listings: f.listings.length, suppliers: f.suppliers.length, commodities: f.commodities.length } }))]);
  const savedCount = favs.counts.listings + favs.counts.suppliers + favs.counts.commodities;

  return (
    <div className="container-page max-w-4xl py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.buyer.title")}</h1>
          <p className="text-text-muted">{t("auth.welcome", { name: user.name || user.phone })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.isSeller ? (
            <Link href="/dashboard/seller" className={buttonClass("outline", "md")}>
              {t("account.switch.seller")}
            </Link>
          ) : (
            <form action={enableSellerAction}>
              <button type="submit" className={buttonClass("outline", "md")} title={t("dash.startSellingHint")}>
                {t("dash.startSelling")}
              </button>
            </form>
          )}
          <LinkButton href="/rfq/new" variant="primary">
            {t("action.createRfq")}
          </LinkButton>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/dashboard/buyer/requests?status=open" className="card p-4 hover:border-primary">
          <p className="text-sm font-semibold text-text-muted">{t("dash.openRequests")}</p>
          <p className="text-3xl font-extrabold num">{stats.openRequests}</p>
        </Link>
        <Link href="/dashboard/buyer/requests" className="card p-4 hover:border-primary">
          <p className="text-sm font-semibold text-text-muted">{t("dash.offersReceived")}</p>
          <p className="text-3xl font-extrabold num">
            {stats.offersReceived}
            {stats.newOffers > 0 && <span className="ms-2 rounded-full bg-danger px-2 text-sm text-white">{stats.newOffers}</span>}
          </p>
        </Link>
        <Link href="/favorites" className="card p-4 hover:border-primary">
          <p className="text-sm font-semibold text-text-muted">{t("dash.savedItems")}</p>
          <p className="text-3xl font-extrabold num">{savedCount}</p>
        </Link>
      </div>

      <Section title={t("rfq.yourRequests")} action={recent.total > 0 ? { href: "/dashboard/buyer/requests", label: t("dash.allRequests") } : undefined}>
        {recent.items.length ? (
          <RfqList items={recent.items} t={t} locale={locale} />
        ) : (
          <EmptyState icon="📝" title={t("rfq.noRequests")} body={t("rfq.sub")} action={<LinkButton href="/rfq/new">{t("action.createRfq")}</LinkButton>} />
        )}
      </Section>

      <Section title={t("dash.recentSaved")} action={favs.counts.listings > 0 ? { href: "/favorites", label: t("action.viewAll") } : undefined}>
        {favs.listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favs.listings.slice(0, 3).map((l) => (
              <ListingCard key={l.id} l={l} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState icon="⭐" title={t("fav.empty")} action={<LinkButton href="/listings" variant="outline">{t("home.listings.all")}</LinkButton>} />
        )}
      </Section>

      {!user.isSeller && (
        <div className="card mt-2 flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-bold">{t("dash.startSelling")}</p>
            <p className="text-text-muted">{t("dash.startSellingHint")}</p>
          </div>
          <form action={enableSellerAction}>
            <button type="submit" className={buttonClass("accent", "md")}>
              {t("account.becomeSeller")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
