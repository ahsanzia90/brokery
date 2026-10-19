"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError, requirePermission } from "@/lib/authz/guards";
import type { ActionResult } from "@/lib/validation/common";
import { importPricesCsv } from "./csv";
import { createPrice, expirePrice, PriceError, publishPrice, rejectPrice, scheduleExpiry, submitForReview, updatePrice, upsertSource, type PriceInput, type SourceInput } from "./service";

function fail(e: unknown): ActionResult<never> {
  if (e instanceof PriceError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
  if (e instanceof AuthError) return { ok: false, error: e.code === "forbidden" ? "forbidden" : "unauthenticated" };
  console.error(e);
  return { ok: false, error: "unexpected_error" };
}

function revalidatePublic() {
  revalidatePath("/prices", "layout");
  revalidatePath("/");
}

function priceInputFromForm(fd: FormData): PriceInput {
  const s = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    commodityId: s("commodityId"),
    varietyId: s("varietyId") || null,
    gradeId: s("gradeId") || null,
    locationId: s("locationId"),
    amount: s("amount"),
    currency: s("currency") || "PKR",
    unitId: s("unitId"),
    priceType: (s("priceType") || "indicative") as PriceInput["priceType"],
    lowAmount: s("lowAmount") || null,
    highAmount: s("highAmount") || null,
    observationDate: s("observationDate"),
    validUntil: s("validUntil") || null,
    sourceId: s("sourceId") || null,
    sourceReference: s("sourceReference") || null,
    notes: s("notes") || null,
  };
}

export async function savePriceAction(_prev: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("prices.edit");
    const id = String(fd.get("id") ?? "");
    const intent = String(fd.get("intent") ?? "draft"); // draft | review | publish
    const reason = String(fd.get("reason") ?? "");
    const input = priceInputFromForm(fd);
    let row;
    if (id) row = await updatePrice(id, input, user.id, reason || null);
    else row = await createPrice(input, user.id, { status: intent === "review" ? "pending_review" : "draft" });
    if (intent === "review" && row.status === "draft") row = await submitForReview(row.id, user.id);
    if (intent === "publish") {
      await requirePermission("prices.publish");
      row = await publishPrice(row.id, user.id);
    }
    revalidatePublic();
    return { ok: true, data: { id: row.id }, message: row.status };
  } catch (e) {
    return fail(e);
  }
}

export async function publishPriceAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.publish");
    await publishPrice(id, user.id);
    revalidatePublic();
    revalidatePath("/admin/prices");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function expirePriceAction(id: string, reason?: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.publish");
    await expirePrice(id, user.id, reason ?? null);
    revalidatePublic();
    revalidatePath("/admin/prices");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectPriceAction(id: string, reason?: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.edit");
    await rejectPrice(id, user.id, reason ?? "");
    revalidatePath("/admin/prices");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function submitForReviewAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.edit");
    await submitForReview(id, user.id);
    revalidatePath("/admin/prices");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function scheduleExpiryAction(id: string, validUntil: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.publish");
    const d = new Date(validUntil);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "invalid_date" };
    await scheduleExpiry(id, d, user.id);
    revalidatePublic();
    revalidatePath("/admin/prices");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSourceAction(_prev: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("prices.edit");
    const id = String(fd.get("id") ?? "") || null;
    const input: SourceInput = {
      name: String(fd.get("name") ?? ""),
      sourceType: (String(fd.get("sourceType") ?? "other") || "other") as SourceInput["sourceType"],
      url: String(fd.get("url") ?? "") || null,
      reference: String(fd.get("reference") ?? "") || null,
      isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
    };
    const row = await upsertSource(input, user.id, id);
    revalidatePath("/admin/prices/sources");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleSourceActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await requirePermission("prices.edit");
    const { getPriceSources } = await import("./queries");
    const src = (await getPriceSources()).find((s) => s.id === id);
    if (!src) return { ok: false, error: "not_found" };
    await upsertSource({ name: src.name, sourceType: src.sourceType, url: src.url, reference: src.reference, isActive: active }, user.id, id);
    revalidatePath("/admin/prices/sources");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function importCsvAction(_prev: unknown, fd: FormData): Promise<ActionResult<{ jobId: string; status: string; total: number; imported: number; failed: number; errors: Array<{ row: number; message: string }> }>> {
  try {
    const user = await requirePermission("prices.edit");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "file_required", fieldErrors: { file: "required" } };
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: "file_too_large" };
    const publish = fd.get("publish") === "on";
    if (publish) await requirePermission("prices.publish");
    const csvText = await file.text();
    const res = await importPricesCsv({ actorId: user.id, filename: file.name, csvText, publish });
    if (publish && res.imported > 0) revalidatePublic();
    revalidatePath("/admin/prices");
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

/** Form-action variant used by simple server-rendered buttons. */
export async function priceRowAction(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const op = String(fd.get("op") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const back = String(fd.get("back") ?? "/admin/prices");
  let res: ActionResult;
  if (op === "publish") res = await publishPriceAction(id);
  else if (op === "expire") res = await expirePriceAction(id, reason);
  else if (op === "reject") res = await rejectPriceAction(id, reason);
  else if (op === "review") res = await submitForReviewAction(id);
  else res = { ok: false, error: "unknown_op" };
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}${res.ok ? `done=${op}` : `error=${encodeURIComponent(res.error)}`}`);
}
