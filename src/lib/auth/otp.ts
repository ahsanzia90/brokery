import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { otpChallenges } from "@/db/schema";
import { generateOtpCode, hashIp, hashOtp, safeEqualHex } from "./crypto";
import { getOtpProvider } from "./providers";
import { enforceRateLimit } from "./rate-limit";

const TTL = Number(process.env.OTP_CODE_TTL_SECONDS ?? 300);
const COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 45);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

export type RequestOtpResult =
  | { ok: true; challengeId: string; expiresInSeconds: number; cooldownSeconds: number; delivery: "sent" | "failed"; deliveryError?: string }
  | { ok: false; error: "cooldown" | "rate_limited" | "not_configured"; retryAfterSeconds?: number };

export async function requestOtp(phone: string, ip: string | null, purpose: "login" | "phone_change" | "account_recovery" = "login"): Promise<RequestOtpResult> {
  // Abuse controls: per phone and per IP.
  try {
    await enforceRateLimit(`otp:phone:${phone}`, 5, 15 * 60);
    if (ip) await enforceRateLimit(`otp:ip:${hashIp(ip)}`, 20, 60 * 60);
  } catch (e) {
    return { ok: false, error: "rate_limited", retryAfterSeconds: (e as { retryAfterSeconds?: number }).retryAfterSeconds };
  }

  const [latest] = await db
    .select({ createdAt: otpChallenges.createdAt })
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, phone), eq(otpChallenges.purpose, purpose)))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (latest) {
    const since = (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
    if (since < COOLDOWN) return { ok: false, error: "cooldown", retryAfterSeconds: Math.ceil(COOLDOWN - since) };
  }

  const provider = getOtpProvider();
  if (!provider.configured) return { ok: false, error: "not_configured" };

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + TTL * 1000);
  const [challenge] = await db
    .insert(otpChallenges)
    .values({
      phone,
      purpose,
      codeHash: hashOtp(phone, code),
      maxAttempts: MAX_ATTEMPTS,
      deliveryProvider: provider.name,
      ipHash: hashIp(ip),
      expiresAt,
    })
    .returning({ id: otpChallenges.id });

  const delivery = await provider.send(phone, code, TTL);
  await db
    .update(otpChallenges)
    .set({ deliveryStatus: delivery.ok ? "sent" : "failed", deliveryError: delivery.ok ? null : delivery.error })
    .where(eq(otpChallenges.id, challenge.id));

  return {
    ok: true,
    challengeId: challenge.id,
    expiresInSeconds: TTL,
    cooldownSeconds: COOLDOWN,
    delivery: delivery.ok ? "sent" : "failed",
    deliveryError: delivery.ok ? undefined : delivery.error,
  };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "expired" | "too_many" | "not_found"; attemptsRemaining?: number };

export async function verifyOtp(phone: string, code: string, purpose: "login" | "phone_change" | "account_recovery" = "login"): Promise<VerifyOtpResult> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "invalid" };
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, phone), eq(otpChallenges.purpose, purpose), isNull(otpChallenges.consumedAt), gt(otpChallenges.expiresAt, new Date())))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (!challenge) return { ok: false, error: "expired" };
  if (challenge.attempts >= challenge.maxAttempts) return { ok: false, error: "too_many" };

  const matches = safeEqualHex(challenge.codeHash, hashOtp(phone, code));
  if (!matches) {
    const attempts = challenge.attempts + 1;
    await db.update(otpChallenges).set({ attempts }).where(eq(otpChallenges.id, challenge.id));
    const remaining = challenge.maxAttempts - attempts;
    return remaining <= 0 ? { ok: false, error: "too_many" } : { ok: false, error: "invalid", attemptsRemaining: remaining };
  }
  await db.update(otpChallenges).set({ consumedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
  return { ok: true };
}
