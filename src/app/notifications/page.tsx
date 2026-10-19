import type { Metadata } from "next";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/section";
import { buttonClass } from "@/components/ui/button";
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
    <div className="container-page max-w-3xl py-6">
      <PageHeader title={t("notif.title")}>
        {total > 0 && (
          <form action={markAllReadAction} className="mt-3">
            <button type="submit" className={buttonClass("outline", "sm")} disabled={unread === 0}>
              {t("notif.markRead")}
            </button>
          </form>
        )}
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon="🔔" title={t("notif.empty")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((n) => (
            <li key={n.id} className={`card p-4 ${n.readAt ? "" : "border-primary bg-primary-soft/40"}`}>
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="w-full text-start">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{n.title}</p>
                    {!n.readAt && <Badge tone="primary">{t("notif.unread")}</Badge>}
                  </div>
                  {n.body && <p className="mt-1 text-[0.95rem] text-text-muted">{n.body}</p>}
                  <p className="mt-1 text-sm text-text-muted num">{formatDateTime(n.createdAt, locale)}</p>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/notifications?page=${p}`} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
      {external.length > 0 && (
        <div className="card mt-6 p-4 text-sm text-text-muted">
          <p className="font-semibold text-text">{t("notif.channels")}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {external.map((e) => (
              <li key={`${e.channel}-${e.deliveryStatus}`} className="num">
                {e.channel.toUpperCase()}: {t(`notif.delivery.${e.deliveryStatus === "read" ? "sent" : e.deliveryStatus}`)} ({e.n})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
