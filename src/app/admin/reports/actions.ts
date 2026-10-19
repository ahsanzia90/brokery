"use server";
import { requirePermission } from "@/lib/authz/guards";
import { runAdminAction } from "@/lib/admin/ops-actions";
import { addCaseNote, assignCase, resolveListingReport, setCaseSeverity, setCaseStatus } from "@/lib/admin/cases-service";

export async function assignCaseAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await assignCase(a.id, p.id, p.assignedTo === "me" ? a.id : p.assignedTo || null);
  });
}
export async function setSeverityAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await setCaseSeverity(a.id, p.id, p.severity as "low" | "medium" | "high" | "critical");
  });
}
export async function addNoteAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await addCaseNote(a.id, p.id, p.text ?? "");
  });
}
export async function setCaseStatusAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await setCaseStatus(a.id, p.id, p.status as "open" | "in_progress" | "waiting_on_user" | "resolved" | "dismissed", p.reason ?? p.resolution ?? "");
  });
}
export async function resolveListingReportAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("reports.manage");
    await resolveListingReport(a.id, p.id, p.status as "resolved" | "dismissed" | "under_review", p.reason ?? "");
  });
}
