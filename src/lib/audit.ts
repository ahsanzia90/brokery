import "server-only";
import { db, type Tx } from "@/db";
import { adminAuditLogs } from "@/db/schema";

const REDACT = new Set(["codeHash", "tokenHash", "storagePath", "registrationNumber", "phone", "email", "ipHash"]);

function redact(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT.has(k)) out[k] = "[redacted]";
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) out[k] = "[object]";
    else out[k] = v;
  }
  return out;
}

export async function audit(
  params: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
  },
  tx?: Tx,
): Promise<void> {
  const executor = tx ?? db;
  await executor.insert(adminAuditLogs).values({
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    before: redact(params.before),
    after: redact(params.after),
    reason: params.reason ?? null,
  });
}
