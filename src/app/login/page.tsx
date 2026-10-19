import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", ...NOINDEX };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/");
  const { t } = await getT();
  const otpConfigured = process.env.NODE_ENV !== "production" || ["twilio", "http"].includes((process.env.OTP_PROVIDER ?? "console").toLowerCase());
  return (
    <div className="container-page max-w-md py-8">
      <h1 className="text-2xl font-bold">{t("auth.title")}</h1>
      <p className="mt-2 text-text-muted">{t("auth.sub")}</p>
      <div className="card mt-6 p-5">
        <LoginForm next={next ?? "/"} otpConfigured={otpConfigured} />
      </div>
      <p className="mt-4 text-sm text-text-muted">{t("auth.recovery")}</p>
    </div>
  );
}
