"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz/guards";
import type { ActionResult } from "@/lib/validation/common";
import { upsertBusiness, requestVerification, type BusinessInput } from "./service";

export async function createOrUpdateBusinessAction(input: BusinessInput): Promise<ActionResult<{ businessId: string; slug: string; created: boolean }>> {
  try {
    const user = await requireUser();
    const res = await upsertBusiness({ userId: user.id }, input);
    if (res.ok) {
      revalidatePath("/dashboard/seller");
      revalidatePath(`/supplier/${res.data!.slug}`);
    }
    return res;
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthenticated" ? "unauthenticated" : "error" };
  }
}

export async function requestVerificationAction(input: { documentIds: string[]; applicantNotes?: string | null }): Promise<ActionResult<{ verificationId: string }>> {
  try {
    const user = await requireUser();
    const res = await requestVerification({ userId: user.id }, input);
    if (res.ok) revalidatePath("/dashboard/seller/verification");
    return res;
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthenticated" ? "unauthenticated" : "error" };
  }
}
