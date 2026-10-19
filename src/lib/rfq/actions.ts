"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthError, requireUser } from "@/lib/authz/guards";
import type { ActionResult } from "@/lib/validation/common";
import { acceptQuoteForDiscussion, cancelRfq, closeRfq, createRfq, declineQuote, RfqError, type CreateRfqInput } from "./service";

function handle(e: unknown): ActionResult {
  if (e instanceof RfqError) return { ok: false, error: e.code, fieldErrors: e.fieldErrors };
  if (e instanceof AuthError) return { ok: false, error: e.code };
  console.error(e);
  return { ok: false, error: "server_error" };
}

/** Create an RFQ from the form payload. Guests are told to sign in (form keeps the draft client-side). */
export async function createRfqAction(payload: CreateRfqInput): Promise<ActionResult<{ id: string; reference: string; matchedCount: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.status !== "active") return { ok: false, error: "forbidden" };
  try {
    const data = await createRfq(user.id, payload);
    revalidatePath("/dashboard/buyer");
    return { ok: true, data };
  } catch (e) {
    return handle(e);
  }
}

export async function acceptQuoteAction(rfqId: string, quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await acceptQuoteForDiscussion(rfqId, quoteId, user.id);
    revalidatePath(`/rfq/${rfqId}`);
    return { ok: true };
  } catch (e) {
    return handle(e);
  }
}

export async function declineQuoteAction(rfqId: string, quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await declineQuote(rfqId, quoteId, user.id);
    revalidatePath(`/rfq/${rfqId}`);
    return { ok: true };
  } catch (e) {
    return handle(e);
  }
}

export async function closeRfqAction(rfqId: string, reason?: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await closeRfq(rfqId, user.id, reason);
    revalidatePath(`/rfq/${rfqId}`);
    revalidatePath("/dashboard/buyer");
    return { ok: true };
  } catch (e) {
    return handle(e);
  }
}

export async function cancelRfqAction(rfqId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await cancelRfq(rfqId, user.id);
    revalidatePath(`/rfq/${rfqId}`);
    revalidatePath("/dashboard/buyer");
    return { ok: true };
  } catch (e) {
    return handle(e);
  }
}

/** Form-action variant used by the dashboard list to close quickly. */
export async function closeRfqFormAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/buyer");
  const id = String(formData.get("rfqId") ?? "");
  try {
    await closeRfq(id, user.id, null);
  } catch {}
  revalidatePath("/dashboard/buyer");
  redirect("/dashboard/buyer/requests");
}
