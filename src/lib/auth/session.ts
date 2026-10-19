import "server-only";
import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { profiles, sessions, userRoles, type roleEnum } from "@/db/schema";
import { generateSessionToken, hashIp, hashSessionToken } from "./crypto";

export const SESSION_COOKIE = "ml_session";
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

export type Role = (typeof roleEnum.enumValues)[number];

export type CurrentUser = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  language: "en" | "ur";
  cityId: string | null;
  status: "active" | "suspended" | "deactivated" | "deleted";
  isBuyer: boolean;
  isSeller: boolean;
  roles: Role[];
  sessionId: string;
};

export async function createSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ipHash: hashIp(ip),
    expiresAt,
  });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }
  c.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/** Resolve the current user from the session cookie. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select({ session: sessions, user: profiles })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  if (row.user.status === "deleted" || row.user.status === "suspended") return null;
  const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, row.user.id));
  // Touch last_seen at most every 10 minutes to limit writes.
  if (Date.now() - new Date(row.session.lastSeenAt).getTime() > 10 * 60_000) {
    void db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id)).catch(() => {});
    void db.update(profiles).set({ lastActiveAt: new Date() }).where(eq(profiles.id, row.user.id)).catch(() => {});
  }
  return {
    id: row.user.id,
    phone: row.user.phone,
    name: row.user.name,
    email: row.user.email,
    language: row.user.language,
    cityId: row.user.cityId,
    status: row.user.status,
    isBuyer: row.user.isBuyer,
    isSeller: row.user.isSeller,
    roles: roles.map((r) => r.role),
    sessionId: row.session.id,
  };
});
