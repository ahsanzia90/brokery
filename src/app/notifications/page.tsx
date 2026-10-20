import type { Metadata } from "next";
import { and, count, desc, eq } from "drizzle-orm";
import { Bell, CheckCheck } from "lucide-react";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { formatDateTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClass } from "@/components/ui/button";
import { DashHeader } from "@/components/flows/dashboard-shell";
import { WithDashboardShell } from "@/components/flows/shell-page";
import { markAllReadAction, openNotificationAction } from "./actions";

export const metadata: Metadata = { title: "Notifications", ...NOINDEX };

const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const user = await requireUserPage("/notifications");
  const { t, locale } = await getT();
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const where = and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"));
  const [[{ total }], rows, external] = await Promise.all([
    db.select({ total: count() }).from(notifications).where(where),
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db
      .select({ channel: notifications.channel, deliveryStatus: notifications.deliveryStatus, n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.channel, "sms")))
      .groupBy(notifications.channel, notifications.deliveryStatus),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <WithDashboardShell user={user} t={t}>
      <DashHeader
        title={t("notif.title")}
        actions={
          total > 0 ? (
            <form action={markAllReadAction}>
              <button type="submit" className={buttonClass("outline", "sm")} disabled={unread === 0}>
                <CheckCheck className="h-4 w-4" aria-hidden /> {t("notif.markRead")}
              </button>
            </form>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title={t("notif.empty")} />
      ) : (
        <ul className="divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface">
          {rows.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "bg-brand-50/50"}>
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="flex w-full items-start gap-3 px-4 py-3.5 text-start hover:bg-surface-2">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand-800"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] ${n.readAt ? "font-medium text-ink-2" : "font-bold text-ink"}`}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[14px] text-muted">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted num">{formatDateTime(n.createdAt, locale)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/notifications?page=${p}`} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
      {external.length > 0 && (
        <div className="mt-6 rounded-[var(--r-md)] bg-surface-2 px-4 py-3 text-[13px] text-muted">
          <p className="font-semibold text-ink-2">{t("notif.channels")}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {external.map((e) => (
              <li key={`${e.channel}-${e.deliveryStatus}`} className="num">
                {e.channel.toUpperCase()}: {t(`notif.delivery.${e.deliveryStatus === "read" ? "sent" : e.deliveryStatus}`)} ({e.n})
              </li>
            ))}
          </ul>
        </div>
      )}
    </WithDashboardShell>
  );
}
