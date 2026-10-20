import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/session";
import type { Translator } from "@/lib/i18n/translate";
import { DashboardShell } from "./dashboard-shell";

/** Standalone signed-in routes (favorites, notifications, account) share the dashboard shell. */
export async function WithDashboardShell({ user, t, children }: { user: CurrentUser; t: Translator; children: React.ReactNode }) {
  const h = await headers();
  const path = h.get("x-current-path") ?? "/";
  const [unread] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
  return (
    <DashboardShell mode={user.isSeller ? "seller" : "buyer"} currentPath={path} t={t} user={user} badges={{ notifications: unread?.n || undefined }}>
      {children}
    </DashboardShell>
  );
}
