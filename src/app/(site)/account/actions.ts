"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, businesses, notificationPreferences, profiles, supportCases } from "@/db/schema";
import { requireUser } from "@/lib/authz/guards";
import { destroySession, revokeAllSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { makeReference } from "@/lib/utils/ids";
import type { ActionResult } from "@/lib/validation/common";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200).or(z.literal("")).transform((v) => v || null),
  language: z.enum(["en", "ur"]),
  cityId: z.string().uuid().or(z.literal("")).transform((v) => v || null),
});

export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name"), email: formData.get("email") ?? "", language: formData.get("language") ?? "en", cityId: formData.get("cityId") ?? "" });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0] ?? "_")] = i.message;
    return { ok: false, error: "validation", fieldErrors: fe };
  }
  const d = parsed.data;
  await db.update(profiles).set({ name: d.name, email: d.email, language: d.language, cityId: d.cityId }).where(eq(profiles.id, user.id));
  if (isLocale(d.language)) {
    const c = await cookies();
    c.set(LOCALE_COOKIE, d.language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "saved" };
}

export async function updateNotificationPrefsAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const on = (k: string) => formData.get(k) === "on";
  await db
    .insert(notificationPreferences)
    .values({ userId: user.id, inApp: true, sms: on("sms"), email: on("email"), whatsapp: on("whatsapp"), rfqAlerts: on("rfqAlerts"), listingUpdates: on("listingUpdates") })
    .onConflictDoUpdate({ target: notificationPreferences.userId, set: { sms: on("sms"), email: on("email"), whatsapp: on("whatsapp"), rfqAlerts: on("rfqAlerts"), listingUpdates: on("listingUpdates") } });
  revalidatePath("/account");
  return { ok: true, message: "saved" };
}

export async function signOutEverywhereAction() {
  const user = await requireUser();
  await revokeAllSessions(user.id);
  await destroySession();
  redirect("/login");
}

export async function deactivateAccountAction(reason?: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ status: "deactivated", statusReason: reason?.slice(0, 500) ?? "user_requested" }).where(eq(profiles.id, user.id));
    // Hide the user's marketplace presence: pause published listings of businesses they own.
    const owned = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, user.id));
    for (const b of owned) {
      await tx.update(listings).set({ status: "paused", statusReason: "owner_deactivated" }).where(eq(listings.businessId, b.id));
    }
    await tx.insert(supportCases).values({
      reference: makeReference("CASE"),
      caseType: "data_deletion",
      severity: "low",
      status: "open",
      reporterId: user.id,
      subject: "Account deactivated by user — schedule data deletion after retention window",
      description: `User requested deactivation.${reason ? ` Reason: ${reason.slice(0, 500)}` : ""} Retention: 30 days, then delete per privacy policy unless the user signs back in.`,
      entityType: "profile",
      entityId: user.id,
    });
    await audit({ actorId: user.id, action: "account.deactivate", entityType: "profile", entityId: user.id, before: { status: user.status }, after: { status: "deactivated" }, reason: reason ?? null }, tx);
  });
  await revokeAllSessions(user.id);
  await destroySession();
  return { ok: true };
}
