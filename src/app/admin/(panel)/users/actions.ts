"use server";
import { requirePermission, requireSuperAdmin } from "@/lib/authz/guards";
import { runAdminAction } from "@/lib/admin/ops-actions";
import { assignRole, reactivateUser, removeRole, softDeleteUser, suspendUser } from "@/lib/admin/users-service";
import { ADMIN_ROLES } from "@/lib/authz/permissions";
import type { Role } from "@/lib/auth/session";

const ROLES: Role[] = ["buyer", "seller", ...ADMIN_ROLES];
function asRole(v: string): Role {
  if (!ROLES.includes(v as Role)) throw new Error("Invalid role");
  return v as Role;
}

export async function assignRoleAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const role = asRole(p.role);
    const actor = ADMIN_ROLES.includes(role) ? await requireSuperAdmin() : await requirePermission("roles.manage");
    await assignRole({ id: actor.id, roles: actor.roles }, p.userId, role);
  });
}
export async function removeRoleAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const role = asRole(p.role);
    const actor = ADMIN_ROLES.includes(role) ? await requireSuperAdmin() : await requirePermission("roles.manage");
    await removeRole({ id: actor.id, roles: actor.roles }, p.userId, role);
  });
}
export async function suspendUserAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const actor = await requirePermission("users.manage");
    await suspendUser({ id: actor.id, roles: actor.roles }, p.userId, p.reason ?? "");
  });
}
export async function reactivateUserAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const actor = await requirePermission("users.manage");
    await reactivateUser({ id: actor.id, roles: actor.roles }, p.userId, p.reason);
  });
}
export async function deleteUserAction(p: Record<string, string>) {
  return runAdminAction(async () => {
    const actor = await requireSuperAdmin();
    await softDeleteUser({ id: actor.id, roles: actor.roles }, p.userId, p.reason ?? "");
  });
}
