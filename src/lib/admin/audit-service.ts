import "server-only";
import { and, count, desc, eq, gte, like, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, profiles } from "@/db/schema";

export async function listAuditLogs(f: { actor?: string; action?: string; entityType?: string; entityId?: string; from?: string; to?: string; page: number }) {
  const pageSize = 50;
  const conds: SQL[] = [];
  if (f.actor) conds.push(eq(adminAuditLogs.actorId, f.actor));
  if (f.action) conds.push(like(adminAuditLogs.action, `${f.action}%`));
  if (f.entityType) conds.push(eq(adminAuditLogs.entityType, f.entityType));
  if (f.entityId) conds.push(eq(adminAuditLogs.entityId, f.entityId));
  if (f.from && !Number.isNaN(Date.parse(f.from))) conds.push(gte(adminAuditLogs.createdAt, new Date(f.from)));
  if (f.to && !Number.isNaN(Date.parse(f.to))) conds.push(lte(adminAuditLogs.createdAt, new Date(f.to + "T23:59:59.999Z")));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(adminAuditLogs).where(where);
  const rows = await db.select({ a: adminAuditLogs, actor: profiles }).from(adminAuditLogs).leftJoin(profiles, eq(profiles.id, adminAuditLogs.actorId)).where(where).orderBy(desc(adminAuditLogs.createdAt)).limit(pageSize).offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}
