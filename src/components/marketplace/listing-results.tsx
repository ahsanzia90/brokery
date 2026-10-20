import type { Translator } from "@/lib/i18n/translate";
import type { ReactNode } from "react";
import { PackageSearch } from "lucide-react";
import type { ListingSearchResult } from "@/lib/data/listings";
import { ListingCard } from "./cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export function ListingResults({ t, result, hrefFor, emptyAction, emptyTitle, emptyBody }: { t: Translator; result: ListingSearchResult; hrefFor: (p: number) => string; emptyAction?: ReactNode; emptyTitle?: string; emptyBody?: string }) {
  if (!result.items.length) {
    return <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={emptyTitle ?? t("listing.empty")} body={emptyBody ?? t("listing.emptyHint")} action={emptyAction} />;
  }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted">
        <span className="num">{t("common.showing", { from: (result.page - 1) * result.pageSize + 1, to: Math.min(result.total, result.page * result.pageSize), total: result.total })}</span>
        {result.priceUnitNote && <span className="text-[12px]">{t("browse.priceSortNote", { unit: result.priceUnitNote })}</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((l) => (
          <ListingCard key={l.id} l={l} t={t} />
        ))}
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
    </>
  );
}
