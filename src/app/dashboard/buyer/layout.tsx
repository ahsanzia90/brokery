import type { Metadata } from "next";
import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { DashboardShell } from "@/components/flows/dashboard-shell";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export const metadata: Metadata = { title: "Buyer dashboard", ...NOINDEX };

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/dashboard/buyer");
  const { t } = await getT();
  const h = await headers();
  const path = h.get("x-current-path") ?? "/dashboard/buyer";
  const [unread] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
  return (
    <DashboardShell mode="buyer" currentPath={path} t={t} user={user} badges={{ notifications: unread?.n || undefined }}>
      {children}
    </DashboardShell>
  );
}
