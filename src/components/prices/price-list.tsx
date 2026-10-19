import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import { PriceRow, type PriceRowData } from "@/components/marketplace/cards";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, formatNumber, formatPKR } from "@/lib/utils/format";

/** Rows grouped by commodity, each group linking to the commodity rate page. */
export function GroupedPriceList({ items, t, locale, staleDays }: { items: PriceRowData[]; t: Translator; locale: Locale; staleDays: number }) {
  const groups = new Map<string, { name: string; rows: PriceRowData[] }>();
  for (const it of items) {
    const g = groups.get(it.commoditySlug) ?? { name: it.commodityName, rows: [] };
    g.rows.push(it);
    groups.set(it.commoditySlug, g);
  }
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([slug, g]) => (
        <section key={slug} aria-labelledby={`g-${slug}`}>
          <h3 id={`g-${slug}`} className="mb-3 text-lg font-bold">
            <Link href={`/prices/${slug}`} className="hover:text-primary">
              {g.name} ›
            </Link>
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {g.rows.map((p) => (
              <PriceRow key={p.id} p={p} t={t} locale={locale} staleDays={staleDays} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PriceDisclaimer({ t }: { t: Translator }) {
  return (
    <Alert tone="info" className="mb-6">
      {t("price.disclaimer")}
    </Alert>
  );
}

export type HistoryRow = PriceRowData & { status: string; publishedAt: Date | null; previousAmount: string | null };

/** Compact history table: date, variety/grade, location, type, amount, change, status. */
export function HistoryTable({ rows, t, locale, showCommodity }: { rows: HistoryRow[]; t: Translator; locale: Locale; showCommodity?: boolean }) {
  if (!rows.length) return null;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-[0.95rem]">
        <thead>
          <tr className="bg-surface-muted text-start text-sm text-text-muted">
            <th className="px-3 py-2 text-start font-bold">{t("price.observed")}</th>
            {showCommodity && <th className="px-3 py-2 text-start font-bold">{t("common.commodity")}</th>}
            <th className="px-3 py-2 text-start font-bold">{t("common.variety")}</th>
            <th className="px-3 py-2 text-start font-bold">{t("common.market")}</th>
            <th className="px-3 py-2 text-start font-bold">{t("search.priceType")}</th>
            <th className="px-3 py-2 text-end font-bold">{t("common.rate")}</th>
            <th className="px-3 py-2 text-end font-bold">{t("price.change")}</th>
            <th className="px-3 py-2 text-start font-bold">{t("common.source")}</th>
            <th className="px-3 py-2 text-start font-bold">{t("common.status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 num">
                <Link href={`/prices/${r.commoditySlug}/history/${r.id}`} className="underline-offset-2 hover:text-primary hover:underline">
                  {formatDate(r.observationDate, locale)}
                </Link>
              </td>
              {showCommodity && <td className="px-3 py-2">{r.commodityName}</td>}
              <td className="px-3 py-2">
                {r.varietyName ?? "—"}
                {r.gradeName ? ` (${r.gradeName})` : ""}
              </td>
              <td className="px-3 py-2">{r.locationName}</td>
              <td className="px-3 py-2 text-sm">{t(`price.type.${r.priceType}`)}</td>
              <td className="px-3 py-2 text-end font-semibold num">
                {formatPKR(r.amount)} / {r.unitSymbol}
                {r.lowAmount && r.highAmount && (
                  <span className="block text-xs font-normal text-text-muted">
                    {formatNumber(r.lowAmount)}–{formatNumber(r.highAmount)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-end num">
                {r.changePercent && Number(r.changePercent) !== 0 ? (
                  <span className={Number(r.changePercent) > 0 ? "text-danger" : "text-primary"}>
                    {Number(r.changePercent) > 0 ? "▲" : "▼"} {Math.abs(Number(r.changePercent)).toFixed(1)}%
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-sm">{r.sourceName ?? "—"}</td>
              <td className="px-3 py-2">
                <Badge tone={r.status === "published" ? "success" : "neutral"}>{t(`price.status.${r.status}`)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
