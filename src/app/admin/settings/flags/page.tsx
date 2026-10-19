import { asc } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { PAYMENT_FLAGS } from "@/lib/admin/settings-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveFlagAction } from "../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

export default async function FlagsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("flags.manage");
  const sp = await searchParams;
  const flags = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  const isSuper = user.roles.includes("super_admin");
  return (
    <div>
      <AdminPageHeader title="Feature flags" description="Switches for optional features. Flags for monetisation are reserved for a future release and need a super admin." />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <Alert tone="warning" className="mb-4">
        No payment provider is integrated. Turning on <code>payments</code>, <code>subscriptions</code>, <code>featured_listings_paid</code> or <code>premium_insights</code> does not expose any payment UI — there is none. The flags exist so the feature can be built behind them later.
      </Alert>
      <div className="space-y-3">
        {flags.map((f) => {
          const locked = PAYMENT_FLAGS.has(f.key) && !isSuper;
          return (
            <form key={f.key} action={saveFlagAction} className="card grid gap-3 p-4 md:grid-cols-[200px_1fr_1fr_auto] md:items-start">
              <input type="hidden" name="key" value={f.key} />
              <div>
                <p className="font-bold font-latin">{f.key}</p>
                <p className="mt-1"><Badge tone={f.enabled ? "success" : "neutral"}>{f.enabled ? "enabled" : "disabled"}</Badge>{PAYMENT_FLAGS.has(f.key) && <Badge tone="warning" className="ms-1">future</Badge>}</p>
                <p className="mt-1 text-xs text-text-muted">updated {formatDateTime(f.updatedAt)}</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold">Description</span>
                <input name="description" defaultValue={f.description ?? ""} disabled={locked} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2 disabled:opacity-60" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Config (JSON)</span>
                <input name="config" defaultValue={f.config ? JSON.stringify(f.config) : ""} disabled={locked} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2 font-mono text-sm disabled:opacity-60" />
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={f.enabled} disabled={locked} className="h-5 w-5" /> enabled</label>
                <Button type="submit" size="sm" disabled={locked}>{locked ? "Super admin only" : "Save"}</Button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
