import "server-only";
import { revalidatePath } from "next/cache";
import { getSetting } from "@/lib/config/settings";
import { track, type AnalyticsEventName } from "@/lib/analytics/track";

/**
 * Request-context helpers that degrade gracefully when a service is called
 * outside a Next.js request (scripts, tests, cron jobs).
 */
export async function settingOr<T>(key: string, fallback: T): Promise<T> {
  try {
    return await getSetting<T>(key, fallback);
  } catch {
    return fallback;
  }
}

export function safeRevalidate(...paths: string[]) {
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* not in a request context */
    }
  }
}

export async function safeTrack(name: AnalyticsEventName, props?: Parameters<typeof track>[1]) {
  try {
    await track(name, props);
  } catch {
    /* no request context */
  }
}
