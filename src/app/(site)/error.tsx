"use client";
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, buttonClass } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // Reported server-side by Next.js; keep client log minimal and free of user data.
    console.error("Page error", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="container-page py-10 md:py-16">
      <div className="panel panel-rose mx-auto max-w-xl text-center !py-12">
        <TriangleAlert className="mx-auto h-10 w-10 text-danger" aria-hidden />
        <h1 className="mt-4 text-[26px] font-extrabold text-ink">{t("error.500.title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">{t("error.500.body")}</p>
        {error.digest && (
          <p className="mt-2 text-[12px] text-muted font-latin">
            {t("browse.errorRef")}: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            {t("action.retry")}
          </Button>
          <Link href="/" className={buttonClass("outline", "md", "bg-white/70")}>
            {t("error.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
