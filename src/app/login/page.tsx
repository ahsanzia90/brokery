import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { LoginForm } from "./login-form";
import { getOtpProvider } from "@/lib/auth/providers";
import { AuthLayout } from "@/components/flows/auth-layout";

export const metadata: Metadata = { title: "Sign in", ...NOINDEX };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/");
  const { t } = await getT();
  const provider = getOtpProvider();
  const otpConfigured = provider.configured;
  const demoMode = provider.name === "console" && process.env.NODE_ENV === "production" && provider.configured;
  return (
    <AuthLayout t={t} title={t("auth.title")} subtitle={t("auth.sub")} footer={t("auth.recovery")}>
      <LoginForm next={next ?? "/"} otpConfigured={otpConfigured} demoMode={demoMode} />
    </AuthLayout>
  );
}
