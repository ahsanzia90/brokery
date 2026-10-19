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
import { PageHeader } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
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
  const section = "card p-5";
  return (
    <div className="container-page max-w-2xl py-6">
      <PageHeader title={t("account.title")} />
      <div className="flex flex-col gap-5">
        <section className={section} aria-labelledby="profile-h">
          <h2 id="profile-h" className="mb-1 text-lg font-bold">{t("account.profile")}</h2>
          <p className="mb-4 text-sm text-text-muted">
            {t("common.phone")}: <span className="font-latin font-semibold">{formatPhoneDisplay(user.phone)}</span> · {t("account.phoneNote")}
          </p>
          <ProfileForm defaults={{ name: user.name, email: user.email, language: user.language, cityId: user.cityId }} cities={cities} />
        </section>

        <section className={section} aria-labelledby="roles-h">
          <h2 id="roles-h" className="mb-1 text-lg font-bold">{t("account.roles")}</h2>
          <p className="mb-3 text-text-muted">{t("account.rolesNote")}</p>
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
          {user.isSeller && <p className="mt-2 text-sm text-primary">{t("account.sellerEnabled")}</p>}
        </section>

        <section className={section} aria-labelledby="notif-h">
          <h2 id="notif-h" className="mb-3 text-lg font-bold">{t("account.notificationPrefs")}</h2>
          <NotificationPrefsForm prefs={{ sms: prefs?.sms ?? true, email: prefs?.email ?? false, whatsapp: prefs?.whatsapp ?? false, rfqAlerts: prefs?.rfqAlerts ?? true, listingUpdates: prefs?.listingUpdates ?? true }} configured={configured} />
        </section>

        <section className={section} aria-labelledby="sessions-h">
          <h2 id="sessions-h" className="mb-1 text-lg font-bold">{t("account.sessions")}</h2>
          <p className="mb-3 text-text-muted">{t("account.signOutAllNote")}</p>
          <div className="flex flex-wrap gap-2">
            <form action={logoutAction}>
              <button type="submit" className={buttonClass("outline", "md")}>{t("nav.logout")}</button>
            </form>
            <form action={signOutEverywhereAction}>
              <button type="submit" className={buttonClass("outline", "md")}>{t("account.signOutAll")}</button>
            </form>
          </div>
        </section>

        <section className={`${section} border-danger/40`} aria-labelledby="deact-h">
          <h2 id="deact-h" className="mb-1 text-lg font-bold">{t("account.deactivate")}</h2>
          <Alert tone="warning" className="mb-3">{t("account.deactivateNote")}</Alert>
          <DeactivateButton />
        </section>
      </div>
    </div>
  );
}
