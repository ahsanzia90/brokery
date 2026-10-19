import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { getDashboardMetrics, parseRange } from "@/lib/admin/dashboard-service";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { BarList } from "@/components/admin/bar-list";
import { str, type SearchParams } from "@/lib/admin/params";
import { hasPermission } from "@/lib/authz/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("admin.access");
  const sp = await searchParams;
  const range = parseRange(str(sp, "from"), str(sp, "to"));
  const m = await getDashboardMetrics(range);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(user.roles, p);
  const t = m.totals;

  return (
    <div>
      <AdminPageHeader title="Dashboard" description="All numbers come from live database records. Date-range metrics use the filter below; totals are all-time." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-sm">
        <label>
          <span className="block font-semibold">From</span>
          <input type="date" name="from" defaultValue={fmt(range.from)} className="rounded border border-border-strong p-2" />
        </label>
        <label>
          <span className="block font-semibold">To</span>
          <input type="date" name="to" defaultValue={fmt(range.to)} className="rounded border border-border-strong p-2" />
        </label>
        <button type="submit" className="rounded-[8px] bg-primary px-4 py-2 font-semibold text-white">
          Apply
        </button>
      </form>

      <h2 className="mb-2 text-lg font-bold">Needs attention</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending listings" value={t.pendingListings} href={can("listings.moderate") ? "/admin/listings?status=pending_review" : undefined} hint="Listings submitted by sellers waiting for review" tone={t.pendingListings > 0 ? "warning" : "default"} />
        <StatCard label="Pending verifications" value={t.pendingVerifications} href={can("verification.review") ? "/admin/verifications?status=submitted" : undefined} hint="Supplier verification requests submitted or under review" tone={t.pendingVerifications > 0 ? "warning" : "default"} />
        <StatCard label="Enquiries awaiting response" value={t.rfqAwaiting} href={can("enquiries.view") ? "/admin/enquiries?status=submitted" : undefined} hint="RFQs with no supplier offer yet (status submitted or matching)" />
        <StatCard label="Open reports & cases" value={t.openCases + t.openReports} href={can("reports.manage") ? "/admin/reports?status=open_all" : undefined} hint="Support cases not resolved + listing reports open" tone={t.openCases + t.openReports > 0 ? "danger" : "default"} />
        <StatCard label="Stale published prices" value={t.stalePrices} href={can("prices.edit") ? "/admin/prices?stale=1" : undefined} hint={`Published rates observed more than ${m.staleDays} days ago`} tone={t.stalePrices > 0 ? "warning" : "default"} />
      </div>

      <h2 className="mb-2 text-lg font-bold">Totals</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={t.totalUsers} href={can("users.view") ? "/admin/users" : undefined} hint="Accounts not deleted" />
        <StatCard label="Buyers" value={t.buyers} hint="Users with the buyer flag" />
        <StatCard label="Sellers" value={t.sellers} hint="Users with the seller flag" />
        <StatCard label="Verified suppliers" value={t.verifiedSuppliers} hint="Active businesses labelled documents reviewed or admin verified" />
        <StatCard label="Active businesses" value={t.activeBusinesses} href={can("verification.review") ? "/admin/businesses" : undefined} hint="Business profiles with status active" />
        <StatCard label="Published listings" value={t.publishedListings} href={can("listings.moderate") ? "/admin/listings?status=published" : undefined} hint="Listings visible to the public" />
        <StatCard label="Buyer enquiries (RFQs)" value={`${t.rfqTotal} / ${t.rfqOpen} open`} hint="All requests / requests not closed or cancelled" />
        <StatCard label="Supplier offers sent" value={t.quotesSent} hint="Quotes recorded in response to RFQs" />
        <StatCard label="Published prices" value={t.publishedPrices} href={can("prices.edit") ? "/admin/prices?status=published" : undefined} hint="Market price records currently published" />
        <StatCard label="Admin accounts" value={t.adminCount} hint="Users holding at least one admin role" />
      </div>

      <h2 className="mb-2 text-lg font-bold">
        In range <span className="text-sm font-normal text-text-muted num">({fmt(range.from)} → {fmt(range.to)})</span>
      </h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="New registrations" value={m.range.newUsersInRange} hint="Profiles created in range" />
        <StatCard label="Listings created" value={m.range.listingsInRange} hint="Any status, created in range" />
        <StatCard label="RFQs created" value={m.range.rfqsInRange} hint="Buyer requests created in range" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="mb-2 font-bold">Registrations per week</h3>
          <BarList items={m.registrationsByWeek.map((r) => ({ label: `w/c ${r.week}`, n: r.n }))} />
        </section>
        <section className="card p-4">
          <h3 className="mb-2 font-bold">Usage events (bots excluded)</h3>
          <BarList items={["home_buy_click", "home_sell_click", "search", "zero_result_search", "listing_view", "supplier_view", "contact_click", "rfq_created"].map((k) => ({ label: k, n: m.eventCounts[k] ?? 0 }))} />
          <p className="mt-2 text-xs text-text-muted">Counts of recorded analytics events; one event per action, deduplicated only by bot filtering.</p>
        </section>
        <section className="card p-4">
          <h3 className="mb-2 font-bold">Listings by top-level category</h3>
          <BarList items={m.listingsByCategory.map((r) => ({ label: r.name, n: r.n }))} />
        </section>
        <section className="card p-4">
          <h3 className="mb-2 font-bold">RFQs by top-level category</h3>
          <BarList items={m.rfqsByCategory.map((r) => ({ label: r.name, n: r.n }))} />
        </section>
        <section className="card p-4">
          <h3 className="mb-2 font-bold">Listings by city</h3>
          <BarList items={m.listingsByCity.map((r) => ({ label: r.name, n: r.n }))} />
        </section>
        <section className="card p-4">
          <h3 className="mb-2 font-bold">RFQs by city</h3>
          <BarList items={m.rfqsByCity.map((r) => ({ label: r.name, n: r.n }))} />
        </section>
        <section className="card p-4 lg:col-span-2">
          <h3 className="mb-2 font-bold">Zero-result searches (top 10)</h3>
          <p className="mb-2 text-xs text-text-muted">Searches that returned nothing — candidates for new commodities or aliases.</p>
          <BarList items={m.zeroResultSearches.map((r) => ({ label: r.q, n: r.n }))} emptyText="No zero-result searches in this range." />
          {can("taxonomy.manage") && (
            <Link href="/admin/taxonomy/requests" className="mt-2 inline-block text-sm text-primary hover:underline">
              Review taxonomy requests ›
            </Link>
          )}
        </section>
      </div>
      {can("settings.manage") && (
        <p className="mt-6 text-sm text-text-muted">
          <Link href="/admin/notifications" className="text-primary hover:underline">
            Notification delivery monitor ›
          </Link>
        </p>
      )}
    </div>
  );
}
