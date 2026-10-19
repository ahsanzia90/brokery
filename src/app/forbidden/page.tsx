import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = { title: "Forbidden", ...NOINDEX };

export default async function ForbiddenPage() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">403</h1>
      <p className="mt-2 text-text-muted">{t("error.forbidden")}</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-primary underline">
        {t("error.goHome")}
      </Link>
    </div>
  );
}
