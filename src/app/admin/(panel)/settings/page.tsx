import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { SETTING_DEFAULTS } from "@/lib/config/settings";
import { NOTIFICATION_TEMPLATE_TYPES, SETTING_GROUPS, type SettingDef } from "@/lib/admin/settings-service";
import { AdminPageHeader } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { saveNotificationTemplatesAction, saveSettingsAction } from "./actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";
import { formatDateTime } from "@/lib/utils/format";

const inp = "adm-control mt-1 w-full disabled:opacity-60";

function Field({ def, value }: { def: SettingDef; value: unknown }) {
  const common = { name: def.key, disabled: def.readOnly };
  let control: React.ReactNode;
  if (def.type === "boolean")
    return (
      <label className="flex min-h-[44px] items-start gap-3 rounded-[var(--r-sm)] border border-line bg-surface-2/50 px-3 py-2.5">
        <input type="checkbox" {...common} defaultChecked={Boolean(value)} className="mt-0.5 h-4 w-4 accent-[var(--brand-800)]" />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">{def.label}{def.readOnly && <span className="ms-2 text-xs font-normal text-warning">Future — not active</span>}</span>
          {def.help && <span className="block text-xs text-muted">{def.help}</span>}
        </span>
      </label>
    );
  else if (def.type === "number") control = <input type="number" step="any" {...common} defaultValue={value === null || value === undefined ? "" : String(value)} className={`${inp} num`} />;
  else if (def.type === "json") control = <input {...common} defaultValue={JSON.stringify(value ?? null)} className={`${inp} font-mono text-sm`} />;
  else if (def.type === "textarea") control = <textarea {...common} defaultValue={value === null || value === undefined ? "" : String(value)} rows={3} className={inp} />;
  else control = <input {...common} defaultValue={value === null || value === undefined ? "" : String(value)} className={inp} />;
  return (
    <label className="block">
      <span className="adm-label">{def.label}{def.readOnly && <span className="ms-2 text-xs font-normal text-warning">Future — not active</span>}</span>
      {control}
      {def.help && <span className="block text-xs text-muted">{def.help}</span>}
    </label>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("settings.manage");
  const sp = await searchParams;
  const rows = await db.select().from(siteSettings);
  const current = new Map(rows.map((r) => [r.key, r]));
  const val = (key: string) => (current.has(key) ? current.get(key)!.value : SETTING_DEFAULTS[key]);
  const logoPath = val("brand.logo_path") as string | null;
  const lastUpdated = rows.reduce<Date | null>((m, r) => (!m || r.updatedAt > m ? r.updatedAt : m), null);
  return (
    <div>
      <AdminPageHeader title="Settings" description={`Site-wide configuration stored in the database and cached for up to a minute. ${lastUpdated ? `Last change ${formatDateTime(lastUpdated)}.` : ""}`} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-6">
      <nav aria-label="Settings sections" className="mb-4 lg:sticky lg:top-20 lg:mb-0 lg:self-start">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {SETTING_GROUPS.map((g) => (
            <li key={g.group}>
              <a href={`#grp-${g.group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="block rounded-[var(--r-sm)] px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface hover:text-ink">{g.group.replace(/ \(.*\)/, "")}</a>
            </li>
          ))}
          <li><a href="#templates" className="block rounded-[var(--r-sm)] px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface hover:text-ink">Notification templates</a></li>
        </ul>
      </nav>
      <div>
      <form action={saveSettingsAction} encType="multipart/form-data" className="space-y-6">
        {SETTING_GROUPS.map((g) => (
          <section key={g.group} id={`grp-${g.group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="card scroll-mt-20 p-4">
            <h2 className="font-bold">{g.group}</h2>
            {g.description && <p className="mb-3 text-sm text-muted">{g.description}</p>}
            {g.group === "Payments (future — not active)" && <Alert tone="warning" className="mb-3">No payment provider, checkout, commission, wallet or escrow exists in this release. These fields are placeholders only.</Alert>}
            <div className="grid gap-4 md:grid-cols-2">
              {g.keys.map((def) => <Field key={def.key} def={def} value={val(def.key)} />)}
              {g.group === "Brand" && (
                <label className="block">
                  <span className="text-sm font-semibold">Upload logo</span>
                  <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" />
                  {logoPath && (
                    <span className="mt-1 flex items-center gap-2 text-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/files/public/${logoPath}`} alt="Current logo" className="h-10 w-auto rounded bg-white p-1" />
                      <label className="flex items-center gap-1"><input type="checkbox" name="removeLogo" /> remove</label>
                    </span>
                  )}
                </label>
              )}
            </div>
          </section>
        ))}
        <div className="adm-footer">
          <Button type="submit">Save settings</Button>
        </div>
      </form>

      <section id="templates" className="card mt-8 p-4">
        <h2 className="font-bold">Notification templates (English)</h2>
        <p className="mb-3 text-sm text-muted">Optional overrides for outbound notification text. Blank = built-in default. Delivery to SMS/email/WhatsApp only happens when a provider is configured on the server; in-app notifications always work.</p>
        <form action={saveNotificationTemplatesAction} className="space-y-4">
          {NOTIFICATION_TEMPLATE_TYPES.map((t) => (
            <div key={t.type} className="grid gap-2 border-b border-line pb-3 md:grid-cols-[220px_1fr_2fr]">
              <div>
                <p className="font-semibold">{t.label}</p>
                <p className="text-xs text-muted font-latin">{t.placeholders.join(" ")}</p>
              </div>
              <input name={`title_${t.type}`} defaultValue={(val(`notify.${t.type}.title`) as string | undefined) ?? ""} placeholder="Title" className={inp} aria-label={`${t.label} title`} />
              <input name={`body_${t.type}`} defaultValue={(val(`notify.${t.type}.body`) as string | undefined) ?? ""} placeholder="Body" className={inp} aria-label={`${t.label} body`} />
            </div>
          ))}
          <Button type="submit" variant="secondary">Save templates</Button>
        </form>
      </section>
      </div>
      </div>
    </div>
  );
}
