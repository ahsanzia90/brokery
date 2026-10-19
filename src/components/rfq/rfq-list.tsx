import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import type { RfqListItem } from "@/lib/rfq/queries";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils/format";

export function RfqList({ items, t, locale }: { items: RfqListItem[]; t: Translator; locale: Locale }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((r) => (
        <li key={r.id} className="card p-4">
          <Link href={`/rfq/${r.id}`} className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-text-muted font-latin">{r.reference}</p>
              <p className="text-lg font-bold">
                {r.commodityName}
                {r.varietyName ? ` — ${r.varietyName}` : ""}
              </p>
              <p className="text-[0.95rem] text-text-muted num">
                {formatNumber(r.quantity)} {r.unitSymbol}
                {r.cityName ? ` · ${r.cityName}` : ""} · {formatDate(r.createdAt, locale)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge tone={rfqStatusTone(r.status)}>{t(`rfq.status.${r.status}`)}</Badge>
              <span className={`text-sm num ${r.quoteCount > 0 ? "font-semibold text-primary" : "text-text-muted"}`}>{t("rfq.offersCount", { count: r.quoteCount })}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
