"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz/guards";
import { getBusinessForUser } from "@/lib/business/queries";
import type { ActionResult } from "@/lib/validation/common";
import type { ListingPayload, StatusAction } from "./schema";
import { createListing, deleteDraft, setListingStatus, updateListing, type ListingActor, type ListingResult } from "./service";

async function actor(): Promise<ListingActor | ActionResult> {
  try {
    const user = await requireUser();
    const business = await getBusinessForUser(user.id);
    if (!business) return { ok: false, error: "no_business" };
    return { userId: user.id, businessId: business.id };
  } catch {
    return { ok: false, error: "unauthenticated" };
  }
}
const isErr = (a: ListingActor | ActionResult): a is ActionResult => "ok" in a;

function revalidate(slug?: string) {
  revalidatePath("/dashboard/seller");
  revalidatePath("/dashboard/seller/listings");
  revalidatePath("/listings");
  revalidatePath("/");
  if (slug) revalidatePath(`/listings/${slug}`);
}

export async function createListingAction(payload: ListingPayload): Promise<ActionResult<ListingResult>> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await createListing(a, payload);
  if (res.ok) revalidate(res.data?.slug);
  return res;
}

export async function updateListingAction(listingId: string, payload: ListingPayload): Promise<ActionResult<ListingResult>> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await updateListing(a, listingId, payload);
  if (res.ok) revalidate(res.data?.slug);
  return res;
}

export async function setListingStatusAction(listingId: string, action: StatusAction): Promise<ActionResult<{ status: string }>> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await setListingStatus(a, listingId, action);
  if (res.ok) revalidate();
  return res;
}

export async function deleteDraftAction(listingId: string): Promise<ActionResult> {
  const a = await actor();
  if (isErr(a)) return a;
  const res = await deleteDraft(a, listingId);
  if (res.ok) revalidate();
  return res;
}
