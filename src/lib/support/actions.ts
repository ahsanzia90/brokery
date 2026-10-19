"use server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { supportCases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { hashIp } from "@/lib/auth/crypto";
import { makeReference } from "@/lib/utils/ids";
import { cleanUserText } from "@/lib/utils/text";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/validation/common";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(5).max(200),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(0).optional().nullable(),
});

export async function submitContactAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ reference: string }>> {
  const parsed = schema.safeParse({ name: formData.get("name"), contact: formData.get("contact"), subject: formData.get("subject"), message: formData.get("message"), website: formData.get("website") });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrorsFromZod(parsed.error) };
  if (parsed.data.website) return { ok: true, data: { reference: makeReference("CASE") } };
  const user = await getCurrentUser();
  const h = await headers();
  const c = await cookies();
  try {
    await enforceRateLimit(user ? `contactform:user:${user.id}` : `contactform:anon:${c.get("ml_anon")?.value ?? hashIp(h.get("x-forwarded-for"))}`, 5, 3600);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }
  const reference = makeReference("CASE");
  const lower = parsed.data.subject.toLowerCase();
  const caseType = /privacy|delete|data/.test(lower) ? "privacy" : /fraud|scam/.test(lower) ? "fraud" : "support";
  await db.insert(supportCases).values({
    reference,
    caseType,
    severity: caseType === "fraud" ? "high" : "medium",
    reporterId: user?.id ?? null,
    reporterContact: `${parsed.data.name} <${parsed.data.contact}>`.slice(0, 300),
    subject: parsed.data.subject,
    description: cleanUserText(parsed.data.message, 4000),
  });
  return { ok: true, data: { reference } };
}
