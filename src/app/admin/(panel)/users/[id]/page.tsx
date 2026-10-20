import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { getUserDetail } from "@/lib/admin/users-service";
import { AdminPageHeader, Table, Td, Th, EmptyRow } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { JsonDetails } from "@/components/admin/json-details";
import { Badge } from "@/components/ui/badge";
import { ADMIN_ROLES, ROLE_LABELS, hasPermission } from "@/lib/authz/permissions";
import { formatDateTime } from "@/lib/utils/format";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { assignRoleAction, deleteUserAction, reactivateUserAction, removeRoleAction, suspendUserAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("users.view");
  const { id } = await params;
  const d = await getUserDetail(id);
  if (!d) notFound();
  const u = d.user;
  const isSuper = actor.roles.includes("super_admin");
  const canManage = hasPermission(actor.roles, "users.manage");
  const canRoles = hasPermission(actor.roles, "roles.manage");
  const grantable = (isSuper ? ["buyer", "seller", ...ADMIN_ROLES] : ["buyer", "seller"]).filter((r) => !d.roles.includes(r as never));

  return (
    <div>
      <AdminPageHeader title={u.name || "(no name)"} breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: u.name || u.phone }]} actions={
        <>
          {canManage && u.status === "active" && <ActionButton action={suspendUserAction} payload={{ userId: u.id }} variant="danger" requireReason confirm={{ title: "Suspend this account?", body: "Sessions are revoked and their published listings are paused until reactivated." }}>Suspend</ActionButton>}
          {canManage && (u.status === "suspended" || u.status === "deactivated") && <ActionButton action={reactivateUserAction} payload={{ userId: u.id }} variant="primary" confirm={{ title: "Reactivate this account?" }}>Reactivate</ActionButton>}
          {isSuper && u.status !== "deleted" && <ActionButton action={deleteUserAction} payload={{ userId: u.id }} variant="danger" requireReason confirm={{ title: "Delete this account?", body: "This anonymises the profile, closes their businesses and removes their listings. It cannot be undone." }}>Delete</ActionButton>}
        </>
      } />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-1">
          <h2 className="mb-2 font-bold">Profile</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-semibold">Phone</dt><dd className="inline num">{formatPhoneDisplay(u.phone)} {u.phoneVerifiedAt ? <Badge tone="success">verified</Badge> : <Badge tone="warning">unverified</Badge>}</dd></div>
            <div><dt className="inline font-semibold">Email</dt><dd className="inline">{u.email ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">Language</dt><dd className="inline">{u.language}</dd></div>
            <div><dt className="inline font-semibold">Status</dt><dd className="inline"><Badge tone={u.status === "active" ? "success" : u.status === "suspended" ? "danger" : "neutral"}>{u.status}</Badge> {u.statusReason && <span className="text-muted">— {u.statusReason}</span>}</dd></div>
            <div><dt className="inline font-semibold">Buyer / Seller</dt><dd className="inline">{u.isBuyer ? "buyer" : ""}{u.isBuyer && u.isSeller ? " + " : ""}{u.isSeller ? "seller" : ""}</dd></div>
            <div><dt className="inline font-semibold">Joined</dt><dd className="inline num">{formatDateTime(u.createdAt)}</dd></div>
            <div><dt className="inline font-semibold">Last active</dt><dd className="inline num">{formatDateTime(u.lastActiveAt) || "—"}</dd></div>
            <div><dt className="inline font-semibold">Active sessions</dt><dd className="inline num">{d.activeSessions}</dd></div>
            <div><dt className="inline font-semibold">Listings created</dt><dd className="inline num">{d.listingCount}</dd></div>
            <div><dt className="inline font-semibold">RFQs posted</dt><dd className="inline num">{d.rfqCount}</dd></div>
          </dl>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Roles</h2>
          <ul className="space-y-2">
            {d.roles.map((r) => (
              <li key={r} className="flex items-center justify-between gap-2">
                <Badge tone={ADMIN_ROLES.includes(r) ? "accent" : "neutral"}>{ROLE_LABELS[r]}</Badge>
                {(ADMIN_ROLES.includes(r) ? isSuper : canRoles) && <ActionButton action={removeRoleAction} payload={{ userId: u.id, role: r }} size="sm" confirm={{ title: `Remove role ${ROLE_LABELS[r]}?` }}>Remove</ActionButton>}
              </li>
            ))}
          </ul>
          {canRoles && grantable.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <ActionButton action={assignRoleAction} payload={{ userId: u.id }} variant="primary" select={{ name: "role", label: "Role to assign", options: grantable.map((r) => ({ value: r, label: ROLE_LABELS[r as keyof typeof ROLE_LABELS] })) }} confirm={{ title: "Assign role", body: isSuper ? "Admin roles grant access to the admin panel. Recorded in the audit log." : "Only a super admin can grant admin roles." }}>Assign role</ActionButton>
            </div>
          )}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Businesses owned</h2>
          {d.businesses.length ? (
            <ul className="space-y-1 text-sm">
              {d.businesses.map((b) => (
                <li key={b.id}><Link href={`/admin/businesses/${b.id}`} className="adm-link">{b.name}</Link> <Badge tone={b.status === "active" ? "success" : "danger"}>{b.status}</Badge> <span className="text-muted">{b.verificationLevel}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">None</p>}
        </section>
      </div>
      <h2 className="adm-section">Recent audit entries</h2>
      <Table>
        <thead><tr><Th>When</Th><Th>Action</Th><Th>Entity</Th><Th>Reason</Th><Th>Changes</Th></tr></thead>
        <tbody>
          {d.audit.length ? d.audit.map((a) => (
            <tr key={a.id}>
              <Td className="num">{formatDateTime(a.createdAt)}</Td>
              <Td>{a.action}{a.actorId === u.id && <span className="ms-1 text-xs text-muted">(as actor)</span>}</Td>
              <Td>{a.entityType} <span className="text-xs text-muted">{a.entityId?.slice(0, 8)}</span></Td>
              <Td>{a.reason ?? "—"}</Td>
              <Td><JsonDetails label="before" value={a.before} /><JsonDetails label="after" value={a.after} /></Td>
            </tr>
          )) : <EmptyRow colSpan={5}>No audit entries.</EmptyRow>}
        </tbody>
      </Table>
    </div>
  );
}
