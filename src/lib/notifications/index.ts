import "server-only";
import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { notificationPreferences, notifications, profiles } from "@/db/schema";

export type NotificationType =
  | "listing_submitted"
  | "listing_approved"
  | "listing_rejected"
  | "listing_expiring"
  | "listing_edit_requested"
  | "new_rfq"
  | "quote_received"
  | "quote_viewed"
  | "buyer_contacted"
  | "verification_update"
  | "admin_request_info"
  | "report_resolved"
  | "system";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkPath?: string;
  entityType?: string;
  entityId?: string;
};

/**
 * Creates an in-app notification (always) and attempts external channels only
 * when a provider is configured AND the user has opted in. Delivery status is
 * recorded truthfully — we never claim a message was sent when it was not.
 */
export async function notify(input: NotifyInput, tx?: Tx): Promise<void> {
  const executor = tx ?? db;
  await executor.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    channel: "in_app",
    title: input.title,
    body: input.body ?? null,
    linkPath: input.linkPath ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    deliveryStatus: "sent",
    sentAt: new Date(),
  });

  // External channels: SMS / email / WhatsApp, each behind provider configuration.
  const [prefs] = await executor.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.userId));
  const [user] = await executor.select({ phone: profiles.phone, email: profiles.email }).from(profiles).where(eq(profiles.id, input.userId));
  if (!user) return;

  const wantsSms = prefs?.sms ?? true;
  const wantsEmail = prefs?.email ?? false;
  const wantsWhatsapp = prefs?.whatsapp ?? false;

  const smsConfigured = ["twilio", "http"].includes((process.env.OTP_PROVIDER ?? "console").toLowerCase());
  const emailConfigured = (process.env.EMAIL_PROVIDER ?? "none") !== "none" && Boolean(process.env.SMTP_HOST);
  const whatsappConfigured = (process.env.WHATSAPP_PROVIDER ?? "none") !== "none" && Boolean(process.env.WHATSAPP_API_TOKEN);

  const pending: Array<{ channel: "sms" | "email" | "whatsapp"; configured: boolean; wanted: boolean }> = [
    { channel: "sms", configured: smsConfigured, wanted: wantsSms },
    { channel: "email", configured: emailConfigured, wanted: wantsEmail && Boolean(user.email) },
    { channel: "whatsapp", configured: whatsappConfigured, wanted: wantsWhatsapp },
  ];

  for (const p of pending) {
    if (!p.wanted) continue;
    // Record the attempt honestly: skipped when the provider is not configured.
    await executor.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      channel: p.channel,
      title: input.title,
      body: input.body ?? null,
      linkPath: input.linkPath ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      deliveryStatus: p.configured ? "pending" : "skipped",
      deliveryError: p.configured ? null : "provider_not_configured",
    });
  }
}

/** Processes pending external notifications. Invoked by /api/cron/notifications. */
export async function deliverPendingNotifications(limit = 50): Promise<{ sent: number; failed: number }> {
  const rows = await db.select().from(notifications).where(eq(notifications.deliveryStatus, "pending")).limit(limit);
  let sent = 0;
  let failed = 0;
  for (const n of rows) {
    let ok = false;
    let error: string | null = null;
    try {
      if (n.channel === "sms") {
        const { getOtpProvider } = await import("@/lib/auth/providers");
        const provider = getOtpProvider();
        const [user] = await db.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.id, n.userId));
        if (provider.configured && provider.name !== "console" && user) {
          const r = await provider.send(user.phone, `${n.title}${n.body ? " – " + n.body : ""}`, 0);
          ok = r.ok;
          error = r.ok ? null : r.error;
        } else error = "provider_not_configured";
      } else if (n.channel === "email") {
        const { sendEmail } = await import("./email");
        const [user] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, n.userId));
        if (user?.email) {
          const r = await sendEmail(user.email, n.title, n.body ?? n.title);
          ok = r.ok;
          error = r.ok ? null : r.error;
        } else error = "no_email";
      } else if (n.channel === "whatsapp") {
        error = "whatsapp_provider_not_implemented"; // integration boundary; see docs/INTEGRATIONS.md
      }
    } catch (e) {
      error = (e as Error).message;
    }
    await db
      .update(notifications)
      .set({ deliveryStatus: ok ? "sent" : "failed", deliveryError: error, sentAt: ok ? new Date() : null })
      .where(eq(notifications.id, n.id));
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
