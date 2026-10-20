"use server";
import { requirePermission, requireSuperAdmin } from "@/lib/authz/guards";
import { runAdminAction } from "@/lib/admin/ops-actions";
import { approveVerification, claimVerification, deleteDocument, rejectVerification, requestMoreInfo, setBusinessFeatured, setBusinessStatus, setDocumentRetention, setVerificationLevel } from "@/lib/admin/verifications-service";

export async function claimVerificationAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await claimVerification(a.id, p.id);
  });
}
export async function approveVerificationAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await approveVerification(a.id, p.id, (p.level || "documents_reviewed") as "documents_reviewed" | "admin_verified", p.reason ?? "");
  });
}
export async function rejectVerificationAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await rejectVerification(a.id, p.id, p.reason ?? "");
  });
}
export async function requestInfoAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await requestMoreInfo(a.id, p.id, p.reason ?? p.message ?? "");
  });
}
export async function setRetentionAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    const d = p.retentionUntil ? new Date(p.retentionUntil) : null;
    if (d && Number.isNaN(d.getTime())) throw new Error("Invalid date");
    await setDocumentRetention(a.id, p.documentId, d);
  });
}
export async function deleteDocumentAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await deleteDocument(a.id, p.documentId, p.reason ?? "");
  });
}
export async function setBusinessFeaturedAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    const until = p.featuredUntil ? new Date(p.featuredUntil) : null;
    await setBusinessFeatured(a.id, p.id, p.featured === "1", until && !Number.isNaN(until.getTime()) ? until : null);
  });
}
export async function setBusinessStatusAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("verification.review");
    await setBusinessStatus(a.id, p.id, p.status as "active" | "suspended" | "closed", p.reason ?? "");
  });
}
export async function setVerificationLevelAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requireSuperAdmin();
    await setVerificationLevel({ id: a.id, roles: a.roles }, p.id, p.level as "none" | "phone_verified" | "documents_reviewed" | "admin_verified", p.reason ?? "");
  });
}
