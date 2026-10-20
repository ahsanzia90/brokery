import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { logoutAction } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account suspended", ...NOINDEX };

export default async function SuspendedPage() {
  const { t } = await getT();
  return (
    <div className="container-page flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger"><ShieldAlert className="h-7 w-7" aria-hidden /></span>
      <h1 className="mt-5 text-[26px] font-extrabold text-ink">{t("account.suspended.title")}</h1>
      <p className="mt-2 text-[15px] text-muted">{t("account.suspended.body")}</p>
      <div className="mt-7 flex gap-3">
        <Link href="/contact" className={buttonClass("primary")}>{t("footer.contact")}</Link>
        <form action={logoutAction}>
          <button type="submit" className={buttonClass("outline")}>{t("nav.logout")}</button>
        </form>
      </div>
    </div>
  );
}
