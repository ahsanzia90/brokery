import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const ANON_COOKIE = "ml_anon";
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime/i;

export type AnalyticsEventName =
  | "home_buy_click"
  | "home_sell_click"
  | "search"
  | "zero_result_search"
  | "category_view"
  | "commodity_view"
  | "listing_view"
  | "supplier_view"
  | "contact_click"
  | "rfq_created"
  | "quote_sent"
  | "seller_onboarding_completed"
  | "listing_created"
  | "listing_approved"
  | "price_view"
  | "language_switch";

/** Server-side event recording. Never stores raw IP or user agent. */
export async function track(
  eventName: AnalyticsEventName,
  props?: { entityType?: string; entityId?: string; path?: string; properties?: Record<string, unknown> },
): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    const isBot = BOT_RE.test(ua);
    const c = await cookies();
    const anon = c.get(ANON_COOKIE)?.value ?? null;
    const user = await getCurrentUser().catch(() => null);
    await db.insert(analyticsEvents).values({
      eventName,
      userId: user?.id ?? null,
      anonymousId: anon,
      entityType: props?.entityType ?? null,
      entityId: props?.entityId ?? null,
      properties: props?.properties ?? null,
      path: props?.path ?? null,
      isBot,
    });
  } catch {
    // analytics must never break a user flow
  }
}
