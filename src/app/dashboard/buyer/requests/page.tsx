import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getBuyerRfqs } from "@/lib/rfq/queries";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/section";
import { RfqList } from "@/components/rfq/rfq-list";

export const metadata: Metadata = { title: "Buying requests", ...NOINDEX };

export default async function BuyerRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const user = await requireUserPage("/dashboard/buyer/requests");
  const { t, locale } = await getT();
  const status = sp.status === "open" || sp.status === "closed" ? sp.status : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const res = await getBuyerRfqs(user.id, { status, page, pageSize: 10 }, locale);
  const tabs = [
    { key: "all", label: t("dash.filter.all") },
    { key: "open", label: t("dash.filter.open") },
    { key: "closed", label: t("dash.filter.closed") },
  ];
  return (
    <div className="container-page max-w-4xl py-6">
      <nav className="mb-2 text-sm text-text-muted">
        <Link href="/dashboard/buyer" className="hover:underline">{t("dash.buyer.title")}</Link>
      </nav>
      <PageHeader title={t("rfq.yourRequests")}>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="tablist">
            {tabs.map((tab) => (
              <Link key={tab.key} role="tab" aria-selected={status === tab.key} href={`/dashboard/buyer/requests${tab.key === "all" ? "" : `?status=${tab.key}`}`} className={`min-h-[44px] rounded-full border px-4 py-2 font-semibold ${status === tab.key ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
                {tab.label}
              </Link>
            ))}
          </div>
          <LinkButton href="/rfq/new" size="md">
            {t("action.createRfq")}
          </LinkButton>
        </div>
      </PageHeader>
      {res.items.length ? (
        <>
          <RfqList items={res.items} t={t} locale={locale} />
          <Pagination page={res.page} totalPages={res.totalPages} hrefFor={(p) => `/dashboard/buyer/requests?${new URLSearchParams({ ...(status !== "all" ? { status } : {}), page: String(p) }).toString()}`} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState icon="📝" title={t("rfq.noRequests")} body={t("rfq.sub")} action={<LinkButton href="/rfq/new">{t("action.createRfq")}</LinkButton>} />
      )}
    </div>
  );
}
