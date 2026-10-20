"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notificationPreferences, profiles, userConsents, userRoles } from "@/db/schema";
import { phoneSchema, otpCodeSchema, type ActionResult } from "@/lib/validation/common";
import { requestOtp, verifyOtp } from "./otp";
import { createSession, destroySession, getCurrentUser } from "./session";
import { track } from "@/lib/analytics/track";

function safeNext(next: unknown): string {
  const s = typeof next === "string" ? next : "/";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/login") ? s : "/";
}

export async function requestOtpAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ phone: string; expiresInSeconds: number; cooldownSeconds: number; delivery: "sent" | "failed"; deliveryError?: string }>> {
  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) return { ok: false, error: "invalid_phone", fieldErrors: { phone: "invalid_phone" } };
  const phone = parsed.data;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const res = await requestOtp(phone, ip, "login");
  if (!res.ok) {
    if (res.error === "cooldown") return { ok: false, error: `cooldown:${res.retryAfterSeconds ?? 30}` };
    if (res.error === "rate_limited") return { ok: false, error: "rate_limited" };
    return { ok: false, error: "not_configured" };
  }
  return { ok: true, data: { phone, expiresInSeconds: res.expiresInSeconds, cooldownSeconds: res.cooldownSeconds, delivery: res.delivery, deliveryError: res.deliveryError } };
}

export async function verifyOtpAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ next: string; isNew: boolean }>> {
  const phoneParsed = phoneSchema.safeParse(formData.get("phone"));
  const codeParsed = otpCodeSchema.safeParse(formData.get("code"));
  if (!phoneParsed.success || !codeParsed.success) return { ok: false, error: "invalid_code" };
  const phone = phoneParsed.data;
  const result = await verifyOtp(phone, codeParsed.data, "login");
  if (!result.ok) {
    if (result.error === "invalid") return { ok: false, error: `invalid_code:${result.attemptsRemaining ?? 0}` };
    if (result.error === "too_many") return { ok: false, error: "too_many" };
    return { ok: false, error: "expired" };
  }

  let [user] = await db.select().from(profiles).where(eq(profiles.phone, phone)).limit(1);
  let isNew = false;
  if (!user) {
    isNew = true;
    const [created] = await db.insert(profiles).values({ phone, phoneVerifiedAt: new Date(), name: "" }).returning();
    user = created;
    await db.insert(userRoles).values({ userId: user.id, role: "buyer" }).onConflictDoNothing();
    await db.insert(notificationPreferences).values({ userId: user.id }).onConflictDoNothing();
  } else {
    if (user.status === "suspended") return { ok: false, error: "suspended" };
    if (user.status === "deleted") return { ok: false, error: "deleted" };
    const updates: Partial<typeof profiles.$inferInsert> = { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(), lastActiveAt: new Date() };
    if (user.status === "deactivated") updates.status = "active"; // signing in reactivates within retention window
    await db.update(profiles).set(updates).where(eq(profiles.id, user.id));
  }
  await maybeBootstrapAdmin(user.id, phone);
  await createSession(user.id);
  const next = safeNext(formData.get("next"));
  const needsProfile = isNew || !user.name;
  // Redirect server-side so the login page cannot race the client navigation.
  redirect(needsProfile ? `/onboarding?next=${encodeURIComponent(next)}` : next);
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  language: z.enum(["en", "ur"]),
  cityId: z.string().uuid().nullable(),
  intent: z.enum(["buyer", "seller", "both"]),
  email: z.string().trim().email().max(200).or(z.literal("")).transform((v) => v || null),
  acceptTerms: z.literal("on"),
});

export async function completeProfileAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ next: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    language: formData.get("language") ?? "en",
    cityId: formData.get("cityId") || null,
    intent: formData.get("intent") ?? "buyer",
    email: formData.get("email") ?? "",
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0] ?? "_")] = i.message;
    return { ok: false, error: "validation", fieldErrors: fe };
  }
  const d = parsed.data;
  const isSeller = d.intent !== "buyer";
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ name: d.name, language: d.language, cityId: d.cityId, email: d.email, isBuyer: true, isSeller }).where(eq(profiles.id, user.id));
    await tx.insert(userRoles).values({ userId: user.id, role: "buyer" }).onConflictDoNothing();
    if (isSeller) await tx.insert(userRoles).values({ userId: user.id, role: "seller" }).onConflictDoNothing();
    await tx.insert(userConsents).values([
      { userId: user.id, consentType: "terms", version: "2026-10" },
      { userId: user.id, consentType: "privacy", version: "2026-10" },
    ]);
  });
  const next = safeNext(formData.get("next"));
  const target = isSeller && (next === "/" || next === "/dashboard/buyer") ? "/dashboard/seller" : next;
  redirect(target);
}

/**
 * Hosted setups without a terminal: the number in BOOTSTRAP_ADMIN_PHONE becomes super admin
 * on its first sign-in, but only while the platform has no super admin at all.
 */
async function maybeBootstrapAdmin(userId: string, phone: string): Promise<void> {
  const configured = process.env.BOOTSTRAP_ADMIN_PHONE;
  if (!configured) return;
  const { normalizePakistanPhone } = await import("@/lib/utils/phone");
  if (normalizePakistanPhone(configured) !== phone) return;
  const [existing] = await db.select({ id: userRoles.id }).from(userRoles).where(eq(userRoles.role, "super_admin")).limit(1);
  if (existing) return;
  await db.insert(userRoles).values({ userId, role: "super_admin" }).onConflictDoNothing();
  const { audit } = await import("@/lib/audit");
  await audit({ actorId: userId, action: "roles.bootstrap_super_admin", entityType: "user", entityId: userId, reason: "BOOTSTRAP_ADMIN_PHONE first sign-in" });
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Lets a buyer start selling from their account without a new sign-up. */
export async function enableSellerAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/seller");
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ isSeller: true }).where(eq(profiles.id, user.id));
    await tx.insert(userRoles).values({ userId: user.id, role: "seller" }).onConflictDoNothing();
  });
  await track("seller_onboarding_completed", { properties: { via: "enable_seller" } });
  redirect("/dashboard/seller");
}
