"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm";
import { deactivateAccountAction, updateNotificationPrefsAction, updateProfileAction } from "./actions";

export function ProfileForm({ defaults, cities }: { defaults: { name: string; email: string | null; language: "en" | "ur"; cityId: string | null }; cities: Array<{ id: string; name: string }> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const res = await updateProfileAction(prev, fd);
    if (res.ok) router.refresh();
    return res;
  }, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} noValidate>
      {state?.ok && <Alert tone="success" className="mb-4">{t("account.saved")}</Alert>}
      <Field label={t("common.name")} required htmlFor="name" error={fe.name ? t("form.required") : null}>
        <Input id="name" name="name" defaultValue={defaults.name} required minLength={2} maxLength={80} />
      </Field>
      <Field label={`${t("common.email")} (${t("common.optional")})`} htmlFor="email" error={fe.email ? t("form.invalid") : null}>
        <Input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} className="font-latin" />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("common.language")} htmlFor="language">
          <Select id="language" name="language" defaultValue={defaults.language}>
            <option value="en">English</option>
            <option value="ur">اردو</option>
          </Select>
        </Field>
        <Field label={t("common.city")} htmlFor="cityId">
          <Select id="cityId" name="cityId" defaultValue={defaults.cityId ?? ""}>
            <option value="">{t("form.selectOne")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" loading={pending}>{t("action.save")}</Button>
    </form>
  );
}

export function NotificationPrefsForm({ prefs, configured }: { prefs: { sms: boolean; email: boolean; whatsapp: boolean; rfqAlerts: boolean; listingUpdates: boolean }; configured: { sms: boolean; email: boolean; whatsapp: boolean } }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateNotificationPrefsAction, null);
  const chan = (ok: boolean) => <span className={`ms-2 rounded-full px-2 py-0.5 text-[12px] font-semibold ${ok ? "bg-brand-50 text-brand-900" : "bg-surface-2 text-muted"}`}>{ok ? t("account.channel.configured") : t("account.channel.notConfigured")}</span>;
  return (
    <form action={action}>
      {state?.ok && <Alert tone="success" className="mb-4">{t("account.saved")}</Alert>}
      <div className="divide-y divide-line rounded-[var(--r-md)] border border-line px-4">
        <Checkbox label={t("account.pref.inApp")} checked readOnly disabled />
        <Checkbox name="sms" label={<>{t("account.pref.sms")}{chan(configured.sms)}</>} defaultChecked={prefs.sms} />
        <Checkbox name="email" label={<>{t("account.pref.email")}{chan(configured.email)}</>} defaultChecked={prefs.email} />
        <Checkbox name="whatsapp" label={<>{t("account.pref.whatsapp")}{chan(configured.whatsapp)}</>} defaultChecked={prefs.whatsapp} />
      </div>
      <div className="mt-3 divide-y divide-line rounded-[var(--r-md)] border border-line px-4">
        <Checkbox name="rfqAlerts" label={t("account.pref.rfqAlerts")} defaultChecked={prefs.rfqAlerts} />
        <Checkbox name="listingUpdates" label={t("account.pref.listingUpdates")} defaultChecked={prefs.listingUpdates} />
      </div>
      <Button type="submit" className="mt-4" loading={pending}>{t("action.save")}</Button>
    </form>
  );
}

export function DeactivateButton() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <ConfirmButton title={t("account.deactivateConfirm")} body={t("account.deactivateNote")} confirmLabel={t("account.deactivate")} cancelLabel={t("action.cancel")} variant="danger" requireReason={false} reasonLabel={t("account.deactivateReason")} onConfirm={async (reason) => {
      const res = await deactivateAccountAction(reason);
      if (res.ok) router.replace("/");
    }}>
      {t("account.deactivate")}
    </ConfirmButton>
  );
}
