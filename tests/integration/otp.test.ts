import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

// Loaded lazily so tests/setup.ts has already pointed DATABASE_URL at the test database.
const { db, pool } = await import("@/db");
const { otpChallenges, rateLimits } = await import("@/db/schema");
const { requestOtp, verifyOtp } = await import("@/lib/auth/otp");
const { enforceRateLimit, RateLimitError } = await import("@/lib/auth/rate-limit");

const PHONE = "+923009990001";

function captureOtp(): { code: () => string; restore: () => void } {
  let last = "";
  const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    const m = String(args[0] ?? "").match(/code for \+\d+: (\d{6})/);
    if (m) last = m[1];
  });
  return { code: () => last, restore: () => spy.mockRestore() };
}

describe("OTP login flow (console provider, hashed codes)", () => {
  beforeAll(async () => {
    await db.delete(otpChallenges).where(eq(otpChallenges.phone, PHONE));
    await db.delete(rateLimits);
  });
  afterAll(async () => {
    await db.delete(otpChallenges).where(eq(otpChallenges.phone, PHONE));
  });

  it("stores only a hash, verifies the right code once, and counts failed attempts", async () => {
    const cap = captureOtp();
    const res = await requestOtp(PHONE, "203.0.113.5");
    cap.restore();
    expect(res.ok).toBe(true);
    const code = cap.code();
    expect(code).toMatch(/^\d{6}$/);

    const [row] = await db.select().from(otpChallenges).where(eq(otpChallenges.phone, PHONE));
    expect(row.codeHash).not.toContain(code);
    expect(row.codeHash).toHaveLength(64);

    const wrong = await verifyOtp(PHONE, code === "000000" ? "111111" : "000000");
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe("invalid");

    const right = await verifyOtp(PHONE, code);
    expect(right.ok).toBe(true);

    const again = await verifyOtp(PHONE, code);
    expect(again.ok).toBe(false); // consumed
  });

  it("enforces the resend cooldown", async () => {
    const cap = captureOtp();
    const res = await requestOtp(PHONE, "203.0.113.5");
    cap.restore();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("cooldown");
  });
});

describe("database-backed rate limiting", () => {
  it("throws after the limit inside the window", async () => {
    const key = `test:${Date.now()}`;
    await enforceRateLimit(key, 2, 60);
    await enforceRateLimit(key, 2, 60);
    await expect(enforceRateLimit(key, 2, 60)).rejects.toBeInstanceOf(RateLimitError);
  });
  afterAll(async () => {
    await pool.end();
  });
});
