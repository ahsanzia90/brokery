import "server-only";
import { redirect } from "next/navigation";
import { AuthError } from "@/lib/authz/guards";

export function fd(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}
export function fdNullable(formData: FormData, key: string): string | null {
  const v = fd(formData, key);
  return v === "" ? null : v;
}
export function fdBool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}
export function fdInt(formData: FormData, key: string, fallback = 0): number {
  const n = parseInt(fd(formData, key), 10);
  return Number.isFinite(n) ? n : fallback;
}
export function fdList(formData: FormData, key: string): string[] {
  return fd(formData, key)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
export function fdAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => (typeof v === "string" ? v : "")).filter(Boolean);
}

/** Redirect back with a flash message; keeps admin forms as plain progressive forms. */
export function back(path: string, msg: { ok?: string; error?: string }): never {
  const u = new URL(path, "http://x");
  if (msg.ok) u.searchParams.set("ok", msg.ok);
  if (msg.error) u.searchParams.set("error", msg.error);
  redirect(u.pathname + u.search);
}

/** Runs an admin mutation; on error redirects back with the message instead of crashing the page. */
export async function runAdmin<T>(fn: () => Promise<T>, errorPath: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) back(errorPath, { error: e.code === "forbidden" ? "You do not have permission for this action." : "Please sign in again." });
    // Next's redirect() throws a special error that must propagate.
    if (typeof e === "object" && e && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Unexpected error";
    back(errorPath, { error: msg });
  }
}
