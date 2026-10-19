import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual, createHash } from "node:crypto";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return s;
}

export function generateOtpCode(): string {
  // Cryptographically random 6-digit code (000000–999999).
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hmac(value: string, context: string): string {
  return createHmac("sha256", secret()).update(`${context}:${value}`).digest("hex");
}

export function hashOtp(phone: string, code: string): string {
  return hmac(`${phone}:${code}`, "otp");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token + secret()).digest("hex");
}

/** IPs are never stored raw; only a keyed hash for abuse investigation. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hmac(ip, "ip").slice(0, 32);
}
