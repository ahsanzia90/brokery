"use server";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  await db
    .update(notifications)
    .set({ readAt: new Date(), deliveryStatus: "read" })
    .where(and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

/** Marks one notification read and follows its link. Ownership enforced by the where clause. */
export async function openNotificationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  const id = String(formData.get("id") ?? "");
  let target = "/notifications";
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const [row] = await db
      .update(notifications)
      .set({ readAt: new Date(), deliveryStatus: "read" })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .returning({ linkPath: notifications.linkPath });
    if (row?.linkPath && row.linkPath.startsWith("/") && !row.linkPath.startsWith("//")) target = row.linkPath;
  }
  revalidatePath("/", "layout");
  redirect(target);
}
