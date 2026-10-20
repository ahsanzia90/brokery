import Link from "next/link";
import { BadgeCheck, Flag, LineChart, MessageSquareText, Package } from "lucide-react";
import { requireAdminPage } from "@/lib/authz/guards";
import { getDashboardMetrics, parseRange } from "@/lib/admin/dashboard-service";
import { AdminPageHeader, AttentionList, Panel, StatStrip, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { BarList } from "@/components/admin/bar-list";
import { str, type SearchParams } from "@/lib/admin/params";
import { hasPermission } from "@/lib/authz/permissions";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  home_buy_click: "Buy action (home)",
  home_sell_click: "Sell action (home)",
  search: "Searches",
  zero_result_search: "Zero-result searches",
  listing_view: "Listing views",
  supplier_view: "Supplier views",
  contact_click: "Contact clicks",
  rfq_created: "Requests created",
};

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
      <AdminPageHeader
        title="Dashboard"
        description="Live figures from the database. Queues first, then totals; the activity panels follow the date range."
        actions={
          <form method="get" className="flex items-center gap-2">
            <label className="adm-field">
              <span>From</span>
              <input type="date" name="from" defaultValue={fmt(range.from)} className="adm-control" />
            </label>
            <label className="adm-field">
              <span>To</span>
              <input type="date" name="to" defaultValue={fmt(range.to)} className="adm-control" />
            </label>
            <button type="submit" className="adm-btn-outline self-end">
              Apply
            </button>
          </form>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Needs attention" description="Work waiting for an admin, oldest first." padded={false}>
          <AttentionList
            items={[
              { icon: <Package className="h-4 w-4" />, label: "Listings pending review", hint: "Submitted by sellers, not yet public", count: t.pendingListings, href: can("listings.moderate") ? "/admin/listings?status=pending_review" : undefined },
              { icon: <BadgeCheck className="h-4 w-4" />, label: "Supplier verifications", hint: "Submitted or under review", count: t.pendingVerifications, href: can("verification.review") ? "/admin/verifications?status=submitted" : undefined, tone: "info" },
              { icon: <MessageSquareText className="h-4 w-4" />, label: "Enquiries without an offer", hint: "Requests still in submitted / matching", count: t.rfqAwaiting, href: can("enquiries.view") ? "/admin/enquiries?status=submitted" : undefined, tone: "info" },
              { icon: <Flag className="h-4 w-4" />, label: "Open reports & cases", hint: "Support cases and listing reports", count: t.openCases + t.openReports, href: can("reports.manage") ? "/admin/reports?status=open_all" : undefined, tone: "danger" },
              { icon: <LineChart className="h-4 w-4" />, label: "Stale published prices", hint: `Observed more than ${m.staleDays} days ago`, count: t.stalePrices, href: can("prices.edit") ? "/admin/prices?stale=1" : undefined },
            ]}
          />
        </Panel>
        <Panel title={`In this range`} description={`${fmt(range.from)} → ${fmt(range.to)}`}>
          <dl className="grid grid-cols-3 gap-4">
            {[
              { l: "New registrations", v: m.range.newUsersInRange },
              { l: "Listings created", v: m.range.listingsInRange },
              { l: "Requests created", v: m.range.rfqsInRange },
            ].map((s) => (
              <div key={s.l}>
                <dt className="text-[12px] font-medium text-muted">{s.l}</dt>
                <dd className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-ink num">{s.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[12px] font-medium text-muted">Registrations per week</p>
            <BarList items={m.registrationsByWeek.map((r) => ({ label: `w/c ${r.week}`, n: r.n }))} />
          </div>
        </Panel>
      </div>

      <StatStrip
        className="mt-4"
        items={[
          { label: "Users", value: t.totalUsers, hint: `${t.buyers} buyers · ${t.sellers} sellers`, href: can("users.view") ? "/admin/users" : undefined },
          { label: "Active businesses", value: t.activeBusinesses, hint: `${t.verifiedSuppliers} verified`, href: can("verification.review") ? "/admin/businesses" : undefined },
          { label: "Published listings", value: t.publishedListings, href: can("listings.moderate") ? "/admin/listings?status=published" : undefined },
          { label: "Open requests", value: t.rfqOpen, hint: `${t.rfqTotal} all-time · ${t.quotesSent} offers sent` },
          { label: "Published prices", value: t.publishedPrices, href: can("prices.edit") ? "/admin/prices?status=published" : undefined },
          { label: "Admin accounts", value: t.adminCount },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Usage events" description="Recorded analytics events in range, bots excluded.">
          <BarList items={Object.keys(EVENT_LABELS).map((k) => ({ label: EVENT_LABELS[k], n: m.eventCounts[k] ?? 0 }))} />
        </Panel>
        <Panel title="Zero-result searches" description="Searches that found nothing — candidates for new commodities or aliases." actions={can("taxonomy.manage") ? <Link href="/admin/taxonomy/requests" className="adm-link text-[12px]">Taxonomy requests ›</Link> : undefined}>
          <BarList items={m.zeroResultSearches.map((r) => ({ label: r.q, n: r.n }))} emptyText="No zero-result searches in this range." />
        </Panel>
        <Panel title="Listings & requests by category" padded={false}>
          <Table minWidth={0} className="rounded-none border-0 shadow-none">
            <thead><tr><Th>Top-level category</Th><Th className="text-end">Listings</Th><Th className="text-end">Requests</Th></tr></thead>
            <tbody>
              {(() => {
                const names = [...new Set([...m.listingsByCategory.map((r) => r.name), ...m.rfqsByCategory.map((r) => r.name)])];
                if (!names.length) return <EmptyRow colSpan={3}>No listings or requests yet.</EmptyRow>;
                return names.map((n) => (
                  <tr key={n}>
                    <Td>{n}</Td>
                    <Td className="text-end num">{m.listingsByCategory.find((r) => r.name === n)?.n ?? 0}</Td>
                    <Td className="text-end num">{m.rfqsByCategory.find((r) => r.name === n)?.n ?? 0}</Td>
                  </tr>
                ));
              })()}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Listings & requests by city" padded={false}>
          <Table minWidth={0} className="rounded-none border-0 shadow-none">
            <thead><tr><Th>City</Th><Th className="text-end">Listings</Th><Th className="text-end">Requests</Th></tr></thead>
            <tbody>
              {(() => {
                const names = [...new Set([...m.listingsByCity.map((r) => r.name), ...m.rfqsByCity.map((r) => r.name)])];
                if (!names.length) return <EmptyRow colSpan={3}>No activity by city yet.</EmptyRow>;
                return names.map((n) => (
                  <tr key={n}>
                    <Td>{n}</Td>
                    <Td className="text-end num">{m.listingsByCity.find((r) => r.name === n)?.n ?? 0}</Td>
                    <Td className="text-end num">{m.rfqsByCity.find((r) => r.name === n)?.n ?? 0}</Td>
                  </tr>
                ));
              })()}
            </tbody>
          </Table>
        </Panel>
      </div>
      {can("settings.manage") && (
        <p className="mt-5 text-[13px] text-muted">
          <Link href="/admin/notifications" className="adm-link">
            Notification delivery monitor ›
          </Link>
        </p>
      )}
    </div>
  );
}
