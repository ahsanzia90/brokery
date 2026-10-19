import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { FilterOption } from "./listing-filters";
import { inputClass } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { SupplierCard, type SupplierCardData } from "./cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

const LEVELS = ["admin_verified", "documents_reviewed", "phone_verified", "none"] as const;

export function SupplierDirectory({ t, action, values, cities, commodities, result, hrefFor, hideCity, emptyBody }: { t: Translator; action: string; values: { q?: string; city?: string; commodity?: string; verification?: string }; cities: FilterOption[]; commodities: FilterOption[]; result: { items: SupplierCardData[]; total: number; page: number; pageSize: number; totalPages: number }; hrefFor: (p: number) => string; hideCity?: boolean; emptyBody?: string }) {
  const sel = `${inputClass} min-h-[44px] py-1.5`;
  return (
    <>
      <form method="get" action={action} className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-semibold">{t("nav.search")}</span>
          <input type="search" name="q" defaultValue={values.q ?? ""} className={sel} placeholder={t("form.searchPlaceholder")} />
        </label>
        {!hideCity && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("common.city")}</span>
            <select name="city" defaultValue={values.city ?? ""} className={sel}>
              <option value="">{t("common.all")}</option>
              {cities.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("common.commodity")}</span>
          <select name="commodity" defaultValue={values.commodity ?? ""} className={sel}>
            <option value="">{t("common.all")}</option>
            {commodities.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("supplier.verificationStatus")}</span>
          <select name="verification" defaultValue={values.verification ?? ""} className={sel}>
            <option value="">{t("common.all")}</option>
            <option value="verified">{t("search.verifiedOnly")}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`supplier.verification.${l}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className={buttonClass("primary", "md")}>
            {t("action.apply")}
          </button>
          <Link href={action} className={buttonClass("ghost", "md")}>
            {t("action.clear")}
          </Link>
        </div>
      </form>
      {result.items.length ? (
        <>
          <p className="mb-3 text-sm text-text-muted num">{t("common.showing", { from: (result.page - 1) * result.pageSize + 1, to: Math.min(result.total, result.page * result.pageSize), total: result.total })}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState icon="🏪" title={t("supplier.empty")} body={emptyBody ?? t("supplier.registerCta")} action={<Link href="/sell" className={buttonClass("accent", "md")}>{t("footer.registerSupplier")}</Link>} />
      )}
    </>
  );
}
