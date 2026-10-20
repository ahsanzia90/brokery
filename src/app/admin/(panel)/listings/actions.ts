"use server";
import { requirePermission } from "@/lib/authz/guards";
import { runAdminAction } from "@/lib/admin/ops-actions";
import { approveListing, bulkApprove, flagSuspiciousPrice, hideListing, rejectListing, requestListingEdits, setImageModeration, setListingFeatured } from "@/lib/admin/listings-service";

export async function approveListingAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await approveListing(a.id, p.id, p.reason);
  });
}
export async function rejectListingAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await rejectListing(a.id, p.id, p.reason ?? "");
  });
}
export async function requestEditsAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await requestListingEdits(a.id, p.id, p.reason ?? "");
  });
}
export async function hideListingAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await hideListing(a.id, p.id, p.reason ?? "");
  });
}
export async function featureListingAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await setListingFeatured(a.id, p.id, p.featured === "1");
  });
}
export async function imageModerationAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    await setImageModeration(a.id, p.imageId, p.status as "approved" | "rejected");
  });
}
export async function flagPriceAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const a = await requirePermission("listings.moderate");
    const ref = await flagSuspiciousPrice(a.id, p.id, p.reason ?? "");
    return { reference: ref };
  });
}
export async function bulkApproveAction(formData: FormData) {
  const a = await requirePermission("listings.moderate");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const { redirect } = await import("next/navigation");
  if (!ids.length) redirect("/admin/listings?status=pending_review&error=" + encodeURIComponent("Select at least one listing"));
  const r = await bulkApprove(a.id, ids);
  redirect(`/admin/listings?status=pending_review&ok=${encodeURIComponent(`${r.ok} approved${r.errors.length ? `, ${r.errors.length} failed: ${r.errors.join("; ").slice(0, 200)}` : ""}`)}`);
}
