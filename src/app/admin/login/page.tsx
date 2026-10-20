import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "@/components/admin/admin.css";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz/permissions";
import { getBrand } from "@/lib/config/settings";
import { getOtpProvider } from "@/lib/auth/providers";
import { NOINDEX } from "@/lib/seo/metadata";
import { LoginForm } from "@/app/(site)/login/login-form";

export const metadata: Metadata = { title: "Admin sign in", ...NOINDEX };

/** Admin sign-in: same phone OTP as the site, but presented as the operations console. */
export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(isAdmin(user.roles) ? "/admin" : "/forbidden");
  const brand = await getBrand();
  const provider = getOtpProvider();
  return (
    <div className="admin-root flex min-h-dvh flex-col bg-brand-950">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-6 flex items-center gap-2 text-white">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <rect width="26" height="26" rx="7" fill="#c7ef6e" />
            <path d="M7 18V8l6 6 6-6v10" stroke="#0b3d29" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-latin text-[18px] font-extrabold tracking-[-0.02em]">{brand.name}</span>
          <span className="rounded-full bg-lime-500/20 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-lime-400">Admin</span>
        </div>
        <div className="rounded-[var(--r-lg)] bg-white p-7 shadow-[var(--shadow-lg)]">
          <h1 className="text-[22px] font-semibold text-ink">Sign in to the admin console</h1>
          <p className="mt-1 text-[14px] text-muted">Use the mobile number that holds your admin role. Website accounts without an admin role cannot enter.</p>
          <div className="mt-6">
            <LoginForm next="/admin" otpConfigured={provider.configured} demoMode={provider.name === "console" && process.env.NODE_ENV === "production" && provider.configured} />
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-white/55">
          <Link href="/" className="hover:text-white">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
