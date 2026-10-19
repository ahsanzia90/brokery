import "server-only";
import { and, count, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, businesses, listingReports, listingStatusHistory, listings, profiles, rfqs, sessions, userRoles } from "@/db/schema";
import { audit } from "@/lib/audit";
import { revokeAllSessions, type Role } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/authz/permissions";
import { AuthError } from "@/lib/authz/guards";

export type UserListFilters = { q?: string; status?: string; role?: string; seller?: string; reported?: string; page: number; pageSize?: number };

export async function listUsers(f: UserListFilters) {
  const pageSize = f.pageSize ?? 25;
  const conds: SQL[] = [];
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(or(ilike(profiles.name, like), ilike(profiles.phone, like), ilike(profiles.email, like))!);
  }
  if (f.status) conds.push(eq(profiles.status, f.status as typeof profiles.status.enumValues[number]));
  if (f.seller === "1") conds.push(eq(profiles.isSeller, true));
  if (f.role) conds.push(exists(db.select({ one: sql`1` }).from(userRoles).where(and(eq(userRoles.userId, profiles.id), eq(userRoles.role, f.role as Role)))));
  if (f.reported === "1") {
    conds.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(listingReports)
          .innerJoin(businesses, eq(businesses.id, listingReports.businessId))
          .where(and(eq(businesses.ownerId, profiles.id), inArray(listingReports.status, ["open", "under_review"]))),
      ),
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(profiles).where(where);
  const rows = await db
    .select({ u: profiles, roles: sql<string[]>`coalesce((SELECT array_agg(role::text) FROM user_roles r WHERE r.user_id = ${profiles.id}), '{}')` })
    .from(profiles)
    .where(where)
    .orderBy(desc(profiles.createdAt))
    .limit(pageSize)
    .offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, pageSize, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getUserDetail(id: string) {
  const [user] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!user) return null;
  const [roles, owned, [lc], [rc], [sc], auditRows] = await Promise.all([
    db.select().from(userRoles).where(eq(userRoles.userId, id)),
    db.select().from(businesses).where(eq(businesses.ownerId, id)),
    db.select({ n: count() }).from(listings).where(eq(listings.createdBy, id)),
    db.select({ n: count() }).from(rfqs).where(eq(rfqs.buyerId, id)),
    db.select({ n: count() }).from(sessions).where(and(eq(sessions.userId, id), sql`${sessions.revokedAt} IS NULL AND ${sessions.expiresAt} > now()`)),
    db
      .select()
      .from(adminAuditLogs)
      .where(or(and(eq(adminAuditLogs.entityType, "user"), eq(adminAuditLogs.entityId, id)), eq(adminAuditLogs.actorId, id)))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(20),
  ]);
  return { user, roles: roles.map((r) => r.role), businesses: owned, listingCount: Number(lc.n), rfqCount: Number(rc.n), activeSessions: Number(sc.n), audit: auditRows };
}

function assertCanManageRole(actorRoles: Role[], role: Role) {
  if (ADMIN_ROLES.includes(role) && !actorRoles.includes("super_admin")) throw new AuthError("forbidden", "Only a super admin can grant or remove admin roles");
}

export async function assignRole(actor: { id: string; roles: Role[] }, userId: string, role: Role) {
  assertCanManageRole(actor.roles, role);
  await db.transaction(async (tx) => {
    await tx.insert(userRoles).values({ userId, role, assignedBy: actor.id }).onConflictDoNothing();
    if (role === "seller") await tx.update(profiles).set({ isSeller: true }).where(eq(profiles.id, userId));
    await audit({ actorId: actor.id, action: "user.role.assign", entityType: "user", entityId: userId, after: { role } }, tx);
  });
}

export async function removeRole(actor: { id: string; roles: Role[] }, userId: string, role: Role) {
  assertCanManageRole(actor.roles, role);
  if (role === "super_admin" && userId === actor.id) throw new Error("You cannot remove your own super admin role");
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
    await audit({ actorId: actor.id, action: "user.role.remove", entityType: "user", entityId: userId, before: { role } }, tx);
  });
}

async function targetIsAdmin(userId: string) {
  const rows = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
  return rows.some((r) => ADMIN_ROLES.includes(r.role));
}

export async function suspendUser(actor: { id: string; roles: Role[] }, userId: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  if (userId === actor.id) throw new Error("You cannot suspend yourself");
  if ((await targetIsAdmin(userId)) && !actor.roles.includes("super_admin")) throw new AuthError("forbidden", "Only a super admin can suspend an admin");
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ status: profiles.status }).from(profiles).where(eq(profiles.id, userId));
    await tx.update(profiles).set({ status: "suspended", statusReason: reason }).where(eq(profiles.id, userId));
    const owned = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, userId));
    if (owned.length) {
      const ids = owned.map((b) => b.id);
      const published = await tx.select({ id: listings.id }).from(listings).where(and(inArray(listings.businessId, ids), eq(listings.status, "published")));
      if (published.length) {
        await tx.update(listings).set({ status: "paused", statusReason: "Account suspended" }).where(inArray(listings.id, published.map((l) => l.id)));
        await tx.insert(listingStatusHistory).values(published.map((l) => ({ listingId: l.id, previousStatus: "published" as const, newStatus: "paused" as const, actorId: actor.id, reason: "Account suspended" })));
      }
    }
    await audit({ actorId: actor.id, action: "user.suspend", entityType: "user", entityId: userId, before: { status: before?.status }, after: { status: "suspended" }, reason }, tx);
  });
  await revokeAllSessions(userId);
}

export async function reactivateUser(actor: { id: string; roles: Role[] }, userId: string, reason?: string) {
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ status: profiles.status }).from(profiles).where(eq(profiles.id, userId));
    if (before?.status === "deleted") throw new Error("Deleted accounts cannot be reactivated");
    await tx.update(profiles).set({ status: "active", statusReason: null }).where(eq(profiles.id, userId));
    const owned = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, userId));
    if (owned.length) {
      const paused = await tx.select({ id: listings.id }).from(listings).where(and(inArray(listings.businessId, owned.map((b) => b.id)), eq(listings.status, "paused"), eq(listings.statusReason, "Account suspended")));
      if (paused.length) {
        await tx.update(listings).set({ status: "published", statusReason: null }).where(inArray(listings.id, paused.map((l) => l.id)));
        await tx.insert(listingStatusHistory).values(paused.map((l) => ({ listingId: l.id, previousStatus: "paused" as const, newStatus: "published" as const, actorId: actor.id, reason: "Account reactivated" })));
      }
    }
    await audit({ actorId: actor.id, action: "user.reactivate", entityType: "user", entityId: userId, before: { status: before?.status }, after: { status: "active" }, reason: reason ?? null }, tx);
  });
}

export async function softDeleteUser(actor: { id: string; roles: Role[] }, userId: string, reason: string) {
  if (!actor.roles.includes("super_admin")) throw new AuthError("forbidden");
  if (!reason.trim()) throw new Error("Reason is required");
  if (userId === actor.id) throw new Error("You cannot delete yourself");
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ status: "deleted", statusReason: reason, name: "Deleted user", email: null, deletedAt: new Date() }).where(eq(profiles.id, userId));
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), inArray(userRoles.role, ADMIN_ROLES)));
    const owned = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, userId));
    if (owned.length) {
      const ids = owned.map((b) => b.id);
      await tx.update(businesses).set({ status: "closed" }).where(inArray(businesses.id, ids));
      await tx.update(listings).set({ status: "removed", statusReason: "Account deleted" }).where(and(inArray(listings.businessId, ids), inArray(listings.status, ["published", "pending_review", "paused", "draft"])));
    }
    await audit({ actorId: actor.id, action: "user.delete", entityType: "user", entityId: userId, after: { status: "deleted" }, reason }, tx);
  });
  await revokeAllSessions(userId);
}

export async function listAdminUsers() {
  return db
    .select({ id: profiles.id, name: profiles.name, phone: profiles.phone })
    .from(profiles)
    .where(exists(db.select({ one: sql`1` }).from(userRoles).where(and(eq(userRoles.userId, profiles.id), inArray(userRoles.role, ADMIN_ROLES)))))
    .orderBy(profiles.name);
}
