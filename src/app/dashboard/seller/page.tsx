import Link from "next/link";
import { getSellerContext } from "@/lib/business/context";
import { getBusinessStats } from "@/lib/business/queries";
import { getSellerListings } from "@/lib/listings/service";
import { getIncomingRfqs } from "@/lib/business/quote-service";
import { LinkButton } from "@/components/ui/button";
import { Badge, listingStatusTone, verificationTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDate } from "@/lib/utils/format";

export default async function SellerOverviewPage() {
  const { user, business, t, locale } = await getSellerContext("/dashboard/seller");
  if (!business) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold">{t("seller.welcome", { name: user.name || "" })}</h1>
        <div className="card mt-4 p-6">
          <h2 className="text-xl font-bold">{t("seller.noBusinessTitle")}</h2>
          <p className="mt-2 text-text-muted">{t("seller.noBusinessBody")}</p>
          <LinkButton href="/dashboard/seller/business" size="lg" className="mt-5 w-full sm:w-auto">
            {t("dash.setupBusiness")} ›
          </LinkButton>
        </div>
      </div>
    );
  }
  const [stats, recent, rfqsNew] = await Promise.all([getBusinessStats(business.id), getSellerListings(business.id), getIncomingRfqs(business.id, "new")]);
  const name = (r: { nameEn: string; nameUr: string | null }) => (locale === "ur" && r.nameUr ? r.nameUr : r.nameEn);
  const cards = [
    { label: t("seller.stats.published"), value: stats.published, href: "/dashboard/seller/listings?status=published" },
    { label: t("seller.stats.pending"), value: stats.pending, href: "/dashboard/seller/listings?status=pending_review" },
    { label: t("seller.stats.views"), value: stats.views },
    { label: t("seller.stats.contacts"), value: stats.contactClicks },
    { label: t("seller.stats.openRfqs"), value: stats.openRfqs, href: "/dashboard/seller/enquiries" },
    { label: t("seller.stats.quotes"), value: stats.quotesSent, href: "/dashboard/seller/enquiries?tab=responded" },
  ];
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-text-muted">
            <Badge tone={verificationTone(business.verificationLevel)}>{t(`supplier.verification.${business.verificationLevel}`)}</Badge>
            <Link href="/dashboard/seller/verification" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              {t("supplier.requestVerification")} ›
            </Link>
            <Link href={`/supplier/${business.slug}`} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              {t("seller.viewPublic")} ›
            </Link>
          </p>
        </div>
        <LinkButton href="/dashboard/seller/listings/new" size="lg">
          + {t("action.createListing")}
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const inner = (
            <div className="card h-full p-4">
              <p className="text-sm font-semibold text-text-muted">{c.label}</p>
              <p className="mt-1 text-2xl font-extrabold num">{formatNumber(c.value)}</p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">{t("seller.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <LinkButton href="/dashboard/seller/listings/new" variant="secondary" size="lg">
            {t("action.createListing")}
          </LinkButton>
          <LinkButton href="/dashboard/seller/business" variant="outline" size="lg">
            {t("seller.nav.business")}
          </LinkButton>
          <LinkButton href="/dashboard/seller/enquiries" variant="outline" size="lg">
            {t("seller.nav.enquiries")}
          </LinkButton>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("seller.recentListings")}</h2>
            <Link href="/dashboard/seller/listings" className="text-sm font-semibold text-primary">
              {t("action.viewAll")} ›
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="📦" title={t("listing.noListings")} action={<Link href="/dashboard/seller/listings/new" className="font-semibold text-primary underline">{t("action.createListing")}</Link>} />
          ) : (
            <ul className="card divide-y divide-border">
              {recent.slice(0, 5).map((r) => (
                <li key={r.l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/seller/listings/${r.l.id}`} className="block truncate font-semibold hover:text-primary">
                      {r.l.title}
                    </Link>
                    <p className="text-sm text-text-muted num">
                      {formatNumber(r.l.quantity)} {r.unitSymbol} · {t("listing.views")}: {r.l.viewCount}
                    </p>
                  </div>
                  <Badge tone={listingStatusTone(r.l.status)}>{t(`listing.status.${r.l.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("seller.recentRfqs")}</h2>
            <Link href="/dashboard/seller/enquiries" className="text-sm font-semibold text-primary">
              {t("action.viewAll")} ›
            </Link>
          </div>
          {rfqsNew.length === 0 ? (
            <EmptyState icon="📨" title={t("rfq.noIncoming")} body={t("biz.commoditiesHint")} />
          ) : (
            <ul className="card divide-y divide-border">
              {rfqsNew.slice(0, 5).map((r) => (
                <li key={r.rfqId} className="px-4 py-3">
                  <Link href={`/dashboard/seller/enquiries/${r.rfqId}`} className="block font-semibold hover:text-primary">
                    {t("enq.needs", { name: r.buyerFirstName })}: {name({ nameEn: r.commodityName, nameUr: r.commodityNameUr })} · <span className="num">{formatNumber(r.quantity)} {r.unitSymbol}</span>
                  </Link>
                  <p className="text-sm text-text-muted">
                    {r.cityName ? `${name({ nameEn: r.cityName, nameUr: r.cityNameUr })} · ` : ""}
                    <span className="num">{formatDate(r.createdAt, locale)}</span>
                    {r.isDirect && <Badge tone="accent" className="ms-2">{t("enq.direct")}</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
