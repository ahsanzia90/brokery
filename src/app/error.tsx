"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { Button, buttonClass } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // Reported server-side by Next.js; keep client log minimal and free of user data.
    console.error("Page error", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="container-page max-w-xl py-16 text-center">
      <h1 className="text-2xl font-bold">{t("error.500.title")}</h1>
      <p className="mt-2 text-text-muted">{t("error.500.body")}</p>
      {error.digest && <p className="mt-1 text-xs text-text-muted font-latin">ref: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          {t("action.retry")}
        </Button>
        <Link href="/" className={buttonClass("outline")}>
          {t("error.goHome")}
        </Link>
      </div>
    </div>
  );
}
