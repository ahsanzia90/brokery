"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_COOKIE } from "./config";
import { track } from "@/lib/analytics/track";

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale");
  const next = String(formData.get("next") ?? "/");
  if (isLocale(locale)) {
    const c = await cookies();
    c.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    await track("language_switch", { properties: { locale } });
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
