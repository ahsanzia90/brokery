import type { Translator } from "@/lib/i18n/translate";
import type { ReactNode } from "react";
import type { ListingSearchResult } from "@/lib/data/listings";
import { ListingCard } from "./cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Alert } from "@/components/ui/alert";

export function ListingResults({ t, result, hrefFor, emptyAction, emptyTitle, emptyBody }: { t: Translator; result: ListingSearchResult; hrefFor: (p: number) => string; emptyAction?: ReactNode; emptyTitle?: string; emptyBody?: string }) {
  if (!result.items.length) {
    return <EmptyState icon="📦" title={emptyTitle ?? t("listing.empty")} body={emptyBody ?? t("listing.emptyHint")} action={emptyAction} />;
  }
  return (
    <>
      <p className="mb-3 text-sm text-text-muted num">{t("common.showing", { from: (result.page - 1) * result.pageSize + 1, to: Math.min(result.total, result.page * result.pageSize), total: result.total })}</p>
      {result.priceUnitNote && (
        <Alert tone="info" className="mb-3">
          {t("browse.priceSortNote", { unit: result.priceUnitNote })}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((l) => (
          <ListingCard key={l.id} l={l} t={t} />
        ))}
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
    </>
  );
}
