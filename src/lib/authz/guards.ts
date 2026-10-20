import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { hasPermission, isAdmin, type Permission } from "./permissions";

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden", message?: string) {
    super(message ?? code);
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (user.status !== "active") throw new AuthError("forbidden", "Account is not active");
  return user;
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user.roles, permission)) throw new AuthError("forbidden");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roles.includes("super_admin")) throw new AuthError("forbidden");
  return user;
}

/** For pages: redirects to login or a 403 page. */
export async function requireUserPage(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  if (user.status !== "active") redirect("/account/suspended");
  return user;
}

export async function requireAdminPage(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdmin(user.roles)) redirect("/forbidden");
  if (permission && !hasPermission(user.roles, permission)) redirect("/admin/forbidden");
  return user;
}
