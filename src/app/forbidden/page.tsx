import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Forbidden", ...NOINDEX };

export default async function ForbiddenPage() {
  const { t } = await getT();
  return (
    <div className="container-page flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-2"><Lock className="h-7 w-7" aria-hidden /></span>
      <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">403</p>
      <h1 className="mt-1 text-[26px] font-extrabold text-ink">{t("error.forbidden")}</h1>
      <Link href="/" className={buttonClass("primary", "md", "mt-7")}>
        {t("error.goHome")}
      </Link>
    </div>
  );
}
