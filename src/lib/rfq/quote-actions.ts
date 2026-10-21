"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz/guards";
import { getBusinessForUser } from "@/lib/business/queries";
import type { ActionResult } from "@/lib/validation/common";
import { declineRfq, joinRfq, markRecipientViewed, sendQuote, withdrawQuote, type QuoteActor, type QuoteInput } from "@/lib/business/quote-service";

async function actor(): Promise<QuoteActor | ActionResult> {
  try {
    const user = await requireUser();
    const business = await getBusinessForUser(user.id);
    if (!business) return { ok: false, error: "no_business" };
    return { userId: user.id, businessId: business.id };
  } catch {
    return { ok: false, error: "unauthenticated" };
  }
}
const isErr = (a: QuoteActor | ActionResult): a is ActionResult => "ok" in a;

function revalidate(rfqId: string) {
  revalidatePath("/dashboard/seller/enquiries");
  revalidatePath(`/dashboard/seller/enquiries/${rfqId}`);
  revalidatePath(`/rfq/${rfqId}`);
  revalidatePath("/dashboard/buyer");
}

export async function sendQuoteAction(rfqId: string, input: QuoteInput): Promise<ActionResult<{ quoteId: string }>> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await sendQuote(a, rfqId, input);
  if (res.ok) revalidate(rfqId);
  return res;
}

export async function declineRfqAction(rfqId: string): Promise<ActionResult> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await declineRfq(a, rfqId);
  if (res.ok) revalidate(rfqId);
  return res;
}

export async function withdrawQuoteAction(rfqId: string): Promise<ActionResult> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await withdrawQuote(a, rfqId);
  if (res.ok) revalidate(rfqId);
  return res;
}

export async function markRecipientViewedAction(rfqId: string): Promise<void> {
  const a = await actor();
  if (isErr(a)) return;
  await markRecipientViewed(a, rfqId);
}

/** Seller adds the request's commodity to their profile so they can respond to it. */
export async function joinRfqAction(rfqId: string): Promise<ActionResult> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await joinRfq(a, rfqId);
  if (res.ok) {
    revalidate(rfqId);
    revalidatePath("/dashboard/seller/business");
  }
  return res;
}
