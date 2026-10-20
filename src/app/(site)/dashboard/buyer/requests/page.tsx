import type { Metadata } from "next";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getBuyerRfqs } from "@/lib/rfq/queries";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { RfqList } from "@/components/rfq/rfq-list";
import { DashHeader, SegmentedTabs } from "@/components/flows/dashboard-shell";

export const metadata: Metadata = { title: "Buying requests", ...NOINDEX };

export default async function BuyerRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const user = await requireUserPage("/dashboard/buyer/requests");
  const { t, locale } = await getT();
  const status = sp.status === "open" || sp.status === "closed" ? sp.status : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const res = await getBuyerRfqs(user.id, { status, page, pageSize: 10 }, locale);
  return (
    <div>
      <DashHeader title={t("rfq.yourRequests")} actions={<LinkButton href="/rfq/new">{t("action.createRfq")}</LinkButton>} />
      <SegmentedTabs
        current={status}
        tabs={[
          { key: "all", label: t("dash.filter.all"), href: "/dashboard/buyer/requests" },
          { key: "open", label: t("dash.filter.open"), href: "/dashboard/buyer/requests?status=open" },
          { key: "closed", label: t("dash.filter.closed"), href: "/dashboard/buyer/requests?status=closed" },
        ]}
      />
      {res.items.length ? (
        <>
          <RfqList items={res.items} t={t} locale={locale} />
          <Pagination page={res.page} totalPages={res.totalPages} hrefFor={(p) => `/dashboard/buyer/requests?${new URLSearchParams({ ...(status !== "all" ? { status } : {}), page: String(p) }).toString()}`} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState title={t("rfq.noRequests")} body={t("rfq.sub")} action={<LinkButton href="/rfq/new" size="sm">{t("action.createRfq")}</LinkButton>} />
      )}
    </div>
  );
}
