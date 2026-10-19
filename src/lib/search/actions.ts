"use server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { taxonomyRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { hashIp } from "@/lib/auth/crypto";
import { cleanUserText } from "@/lib/utils/text";
import type { ActionResult } from "@/lib/validation/common";

const schema = z.object({ name: z.string().trim().min(2).max(120), notes: z.string().max(1000).optional().nullable(), website: z.string().max(0).optional().nullable() });

/** "Tell us about a missing commodity" — creates a taxonomy request for admin review. */
export async function requestMissingCommodityAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse({ name: formData.get("name"), notes: formData.get("notes"), website: formData.get("website") });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: { name: "required" } };
  if (parsed.data.website) return { ok: true };
  const user = await getCurrentUser();
  const h = await headers();
  const c = await cookies();
  try {
    await enforceRateLimit(user ? `taxreq:user:${user.id}` : `taxreq:anon:${c.get("ml_anon")?.value ?? hashIp(h.get("x-forwarded-for"))}`, 5, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }
  await db.insert(taxonomyRequests).values({ requestedBy: user?.id ?? null, requestType: "commodity", proposedName: parsed.data.name, notes: cleanUserText(parsed.data.notes, 1000), metadata: { source: "search_zero_results" } });
  return { ok: true };
}
