"use server";
import { requireUser, AuthError } from "@/lib/authz/guards";
import type { ActionResult } from "@/lib/validation/common";
import { recordBuyerContacted, RfqError } from "./service";
import { track } from "@/lib/analytics/track";

/**
 * Called when a buyer taps Call/WhatsApp on a quote. Returns the supplier's
 * public contact only when the business consented to show it; otherwise the
 * seller is notified that the buyer wants to talk.
 */
export async function contactSupplierForQuoteAction(rfqId: string, quoteId: string, channel: "phone" | "whatsapp"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await recordBuyerContacted(rfqId, quoteId, user.id, channel);
    await track("contact_click", { entityType: "quote", entityId: quoteId, properties: { channel, rfqId } });
    return { ok: true };
  } catch (e) {
    if (e instanceof RfqError) return { ok: false, error: e.code };
    if (e instanceof AuthError) return { ok: false, error: e.code };
    return { ok: false, error: "server_error" };
  }
}
