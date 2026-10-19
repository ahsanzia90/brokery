"use server";
import { requirePermission } from "@/lib/authz/guards";
import { runAdminAction } from "@/lib/admin/ops-actions";
import { closeRfqAsSpam } from "@/lib/admin/enquiries-service";

export async function closeRfqSpamAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await closeRfqAsSpam(a.id, p.id, p.reason ?? "");
  });
}
