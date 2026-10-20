import { requireAdminPage } from "@/lib/authz/guards";
import { getNotificationStats } from "@/lib/admin/dashboard-service";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function NotificationsMonitor() {
  await requireAdminPage("settings.manage");
  const s = await getNotificationStats();
  const providers = {
    sms: ["twilio", "http"].includes((process.env.OTP_PROVIDER ?? "console").toLowerCase()) ? process.env.OTP_PROVIDER : "not configured (console in dev)",
    email: (process.env.EMAIL_PROVIDER ?? "none") !== "none" && process.env.SMTP_HOST ? "smtp" : "not configured",
    whatsapp: (process.env.WHATSAPP_PROVIDER ?? "none") !== "none" ? process.env.WHATSAPP_PROVIDER : "not configured",
  };
  return (
    <div>
      <AdminPageHeader title="Notification delivery" description="Outbound notification attempts by channel. 'skipped' means the user wanted the channel but no provider is configured on this server." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Notifications" }]} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(["sms", "email", "whatsapp"] as const).map((c) => (
          <div key={c} className="card p-4">
            <p className="text-sm font-semibold text-muted uppercase">{c}</p>
            <p className="font-semibold">{providers[c]}</p>
          </div>
        ))}
      </div>
      <Table className="mb-6">
        <thead>
          <tr>
            <Th>Channel</Th>
            <Th>Status</Th>
            <Th>Count</Th>
          </tr>
        </thead>
        <tbody>
          {s.byChannel.length ? s.byChannel.map((r) => (
            <tr key={r.channel + r.status}>
              <Td>{r.channel}</Td>
              <Td>{r.status}</Td>
              <Td className="num">{r.n}</Td>
            </tr>
          )) : <EmptyRow colSpan={3}>No notifications recorded yet.</EmptyRow>}
        </tbody>
      </Table>
      <h2 className="mb-2 font-bold">Recent failed / skipped</h2>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Channel</Th>
            <Th>Type</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {s.failed.length ? s.failed.map((f) => (
            <tr key={f.id}>
              <Td className="num">{formatDateTime(f.createdAt)}</Td>
              <Td>{f.channel}</Td>
              <Td>{f.type}</Td>
              <Td className="text-danger">{f.error}</Td>
            </tr>
          )) : <EmptyRow colSpan={4}>No failures.</EmptyRow>}
        </tbody>
      </Table>
    </div>
  );
}
