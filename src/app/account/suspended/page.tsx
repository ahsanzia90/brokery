import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { logoutAction } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account suspended", ...NOINDEX };

export default async function SuspendedPage() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">{t("account.suspended.title")}</h1>
      <p className="mt-2 text-text-muted">{t("account.suspended.body")}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/contact" className={buttonClass("primary")}>{t("footer.contact")}</Link>
        <form action={logoutAction}>
          <button type="submit" className={buttonClass("outline")}>{t("nav.logout")}</button>
        </form>
      </div>
    </div>
  );
}
