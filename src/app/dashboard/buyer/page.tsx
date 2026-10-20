import Link from "next/link";
import { ClipboardList, Inbox } from "lucide-react";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { getBuyerRfqs, getBuyerRfqStats } from "@/lib/rfq/queries";
import { getFavorites } from "@/lib/favorites/queries";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingCard } from "@/components/marketplace/cards";
import { RfqList } from "@/components/rfq/rfq-list";
import { AttentionList, DashHeader, StatStrip } from "@/components/flows/dashboard-shell";
import { formatNumber } from "@/lib/utils/format";

export default async function BuyerDashboard() {
  const user = await requireUserPage("/dashboard/buyer");
  const { t, locale } = await getT();
  const [stats, recent, favs] = await Promise.all([getBuyerRfqStats(user.id), getBuyerRfqs(user.id, { status: "all", pageSize: 5 }, locale), getFavorites(user.id, locale)]);
  const savedCount = favs.listings.length + favs.suppliers.length + favs.commodities.length;
  const attention: Array<{ label: string; href: string; Icon: typeof Inbox; tone?: "warning" | "info" | "success" }> = [];
  if (stats.newOffers) attention.push({ label: t("dash.attn.newOffers", { count: stats.newOffers }), href: "/dashboard/buyer/requests?status=open", Icon: Inbox, tone: "success" });
  if (recent.total === 0) attention.push({ label: t("dash.attn.noRequests"), href: "/rfq/new", Icon: ClipboardList, tone: "info" });

  return (
    <div>
      <DashHeader eyebrow={t("dash.buyer.title")} title={t("auth.welcome", { name: user.name || user.phone })} actions={<LinkButton href="/rfq/new">{t("action.createRfq")}</LinkButton>} />
      <StatStrip
        items={[
          { label: t("dash.openRequests"), value: formatNumber(stats.openRequests), href: "/dashboard/buyer/requests?status=open" },
          { label: t("dash.offersReceived"), value: formatNumber(stats.offersReceived), href: "/dashboard/buyer/requests", hint: stats.newOffers ? `${stats.newOffers} ${t("common.new").toLowerCase()}` : undefined, tone: stats.newOffers ? "warning" : "default" },
          { label: t("dash.savedItems"), value: formatNumber(savedCount), href: "/favorites" },
        ]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">{t("rfq.yourRequests")}</h2>
              {recent.total > 0 && (
                <Link href="/dashboard/buyer/requests" className="text-[13px] font-semibold text-brand-800 hover:underline">
                  {t("dash.allRequests")} ›
                </Link>
              )}
            </div>
            {recent.items.length ? <RfqList items={recent.items} t={t} locale={locale} /> : <EmptyState compact title={t("rfq.noRequests")} body={t("rfq.sub")} action={<LinkButton href="/rfq/new" size="sm">{t("action.createRfq")}</LinkButton>} />}
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">{t("dash.recentSaved")}</h2>
              {favs.listings.length > 0 && (
                <Link href="/favorites" className="text-[13px] font-semibold text-brand-800 hover:underline">
                  {t("action.viewAll")} ›
                </Link>
              )}
            </div>
            {favs.listings.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {favs.listings.slice(0, 2).map((l) => (
                  <ListingCard key={l.id} l={l} t={t} />
                ))}
              </div>
            ) : (
              <EmptyState compact title={t("fav.empty")} action={<LinkButton href="/listings" variant="outline" size="sm">{t("home.listings.all")}</LinkButton>} />
            )}
          </section>
        </div>
        <AttentionList title={t("dash.needsAttention")} items={attention} allClear={t("dash.allClear")} />
      </div>
    </div>
  );
}
