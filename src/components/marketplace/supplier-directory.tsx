import Link from "next/link";
import { Store } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";
import type { FilterOption } from "./listing-filters";
import { buttonClass } from "@/components/ui/button";
import { SupplierCard, type SupplierCardData } from "./cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitForm } from "@/components/public/auto-submit";

const LEVELS = ["admin_verified", "documents_reviewed", "phone_verified", "none"] as const;
const selWrap = "inline-flex h-10 w-full min-w-0 items-center gap-1 sm:w-auto rounded-[var(--r-sm)] border border-line-strong bg-surface ps-3 pe-2 text-[14px] shadow-[var(--shadow-xs)] focus-within:border-brand-700 focus-within:ring-4 focus-within:ring-brand-800/10";
const sel = "w-full min-w-0 cursor-pointer sm:w-auto sm:max-w-[180px] appearance-none bg-transparent pe-5 font-semibold text-ink outline-none";
const chevron = { backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2368746d' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right center" };

export function SupplierDirectory({ t, action, values, cities, commodities, result, hrefFor, hideCity, emptyBody }: { t: Translator; action: string; values: { q?: string; city?: string; commodity?: string; verification?: string }; cities: FilterOption[]; commodities: FilterOption[]; result: { items: SupplierCardData[]; total: number; page: number; pageSize: number; totalPages: number }; hrefFor: (p: number) => string; hideCity?: boolean; emptyBody?: string }) {
  const active = [values.city, values.commodity, values.verification, values.q].filter(Boolean).length;
  return (
    <>
      <AutoSubmitForm action={action} className="mb-5 flex flex-wrap items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
        <label className={`${selWrap} w-full sm:w-auto`}>
          <span className="shrink-0 text-muted">{t("nav.search")}:</span>
          <input type="search" name="q" defaultValue={values.q ?? ""} placeholder={t("form.searchPlaceholder")} className="w-full min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted-2 sm:w-44" />
        </label>
        {!hideCity && (
          <label className={selWrap}>
            <span className="shrink-0 text-muted">{t("common.city")}:</span>
            <select name="city" defaultValue={values.city ?? ""} className={sel} style={chevron}>
              <option value="">{t("common.all")}</option>
              {cities.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className={selWrap}>
          <span className="shrink-0 text-muted">{t("common.commodity")}:</span>
          <select name="commodity" defaultValue={values.commodity ?? ""} className={sel} style={chevron}>
            <option value="">{t("common.all")}</option>
            {commodities.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className={selWrap}>
          <span className="shrink-0 text-muted">{t("supplier.verificationStatus")}:</span>
          <select name="verification" defaultValue={values.verification ?? ""} className={sel} style={chevron}>
            <option value="">{t("common.all")}</option>
            <option value="verified">{t("search.verifiedOnly")}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{t(`supplier.verification.${l}`)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass("primary", "sm", "h-10")}>
          {t("action.apply")}
        </button>
        {active > 0 && (
          <a href={action} className={buttonClass("ghost", "sm", "h-10")}>
            {t("action.clear")}
          </a>
        )}
      </AutoSubmitForm>
      {result.items.length ? (
        <>
          <p className="mb-3 text-[13px] text-muted num">{t("common.showing", { from: (result.page - 1) * result.pageSize + 1, to: Math.min(result.total, result.page * result.pageSize), total: result.total })}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((s) => (
              <SupplierCard key={s.id} s={s} t={t} />
            ))}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} labels={{ prev: t("common.prev"), next: t("action.next"), page: t("common.page", { page: "" }).trim() }} />
        </>
      ) : (
        <EmptyState icon={<Store className="h-6 w-6" />} title={t("supplier.empty")} body={emptyBody ?? t("supplier.registerCta")} action={<Link href="/sell" className={buttonClass("primary", "md")}>{t("footer.registerSupplier")}</Link>} />
      )}
    </>
  );
}
