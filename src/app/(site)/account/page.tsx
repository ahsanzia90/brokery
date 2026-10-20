import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { getCities, getMajorCities } from "@/lib/data/locations";
import { enableSellerAction, logoutAction } from "@/lib/auth/actions";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { buttonClass } from "@/components/ui/button";
import { DashHeader } from "@/components/flows/dashboard-shell";
import { WithDashboardShell } from "@/components/flows/shell-page";
import { FormSection } from "@/components/flows/form-section";
import { DeactivateButton, NotificationPrefsForm, ProfileForm } from "./account-forms";
import { signOutEverywhereAction } from "./actions";

export const metadata: Metadata = { title: "Account settings", ...NOINDEX };

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  const { t, locale } = await getT();
  const [major, all, [prefs]] = await Promise.all([getMajorCities(), getCities(), db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, user.id)).limit(1)]);
  const cities = [...major, ...all.filter((c) => !c.isMajorMarket)].map((c) => ({ id: c.id, name: locale === "ur" && c.nameUr ? c.nameUr : c.nameEn }));
  const configured = {
    sms: ["twilio", "http"].includes((process.env.OTP_PROVIDER ?? "console").toLowerCase()),
    email: (process.env.EMAIL_PROVIDER ?? "none") !== "none" && Boolean(process.env.SMTP_HOST),
    whatsapp: (process.env.WHATSAPP_PROVIDER ?? "none") !== "none" && Boolean(process.env.WHATSAPP_API_TOKEN),
  };
  return (
    <WithDashboardShell user={user} t={t}>
      <DashHeader title={t("account.title")} description={<span>{t("common.phone")}: <span className="font-latin font-semibold text-ink">{formatPhoneDisplay(user.phone)}</span> · {t("account.phoneNote")}</span>} />
      <div className="max-w-2xl">
        <FormSection first title={t("account.profile")}>
          <ProfileForm defaults={{ name: user.name, email: user.email, language: user.language, cityId: user.cityId }} cities={cities} />
        </FormSection>

        <FormSection title={t("account.roles")} description={t("account.rolesNote")}>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/buyer" className={buttonClass("outline", "md")}>{t("account.switch.buyer")}</Link>
            {user.isSeller ? (
              <Link href="/dashboard/seller" className={buttonClass("outline", "md")}>{t("account.switch.seller")}</Link>
            ) : (
              <form action={enableSellerAction}>
                <button type="submit" className={buttonClass("accent", "md")}>{t("account.becomeSeller")}</button>
              </form>
            )}
          </div>
          {user.isSeller && <p className="mt-2 text-[13px] font-medium text-brand-800">{t("account.sellerEnabled")}</p>}
        </FormSection>

        <FormSection title={t("account.notificationPrefs")}>
          <NotificationPrefsForm prefs={{ sms: prefs?.sms ?? true, email: prefs?.email ?? false, whatsapp: prefs?.whatsapp ?? false, rfqAlerts: prefs?.rfqAlerts ?? true, listingUpdates: prefs?.listingUpdates ?? true }} configured={configured} />
        </FormSection>

        <FormSection title={t("account.sessions")} description={t("account.signOutAllNote")}>
          <div className="flex flex-wrap gap-2">
            <form action={logoutAction}>
              <button type="submit" className={buttonClass("outline", "md")}>{t("nav.logout")}</button>
            </form>
            <form action={signOutEverywhereAction}>
              <button type="submit" className={buttonClass("outline", "md")}>{t("account.signOutAll")}</button>
            </form>
          </div>
        </FormSection>

        <section className="mt-10 rounded-[var(--r-lg)] border border-danger/30 bg-danger-bg/40 p-5">
          <h2 className="text-[17px] font-bold text-danger">{t("account.deactivate")}</h2>
          <p className="mt-1 mb-4 max-w-xl text-[14px] text-ink-2">{t("account.deactivateNote")}</p>
          <DeactivateButton />
        </section>
      </div>
    </WithDashboardShell>
  );
}
