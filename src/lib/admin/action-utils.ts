import "server-only";
import { AuthError } from "@/lib/authz/guards";
import type { ActionResult } from "@/lib/validation/common";

/** Wrap a service call so admin actions return a uniform ActionResult. */
export async function runAdminAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    const msg = (e as Error).message || "error";
    return { ok: false, error: msg.slice(0, 300) };
  }
}

export function fd(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}
