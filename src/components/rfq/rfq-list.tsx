import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import type { RfqListItem } from "@/lib/rfq/queries";
import { Badge, rfqStatusTone } from "@/components/ui/badge";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { formatQuantity } from "@/lib/utils/format";

export function RfqList({ items, t, locale }: { items: RfqListItem[]; t: Translator; locale: Locale }) {
  return (
    <ul className="divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface">
      {items.map((r) => {
        const key = artKeyFor(r.commoditySlug, r.commodityName);
        return (
          <li key={r.id}>
            <Link href={`/rfq/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${artTint[key]}`}>
                <CommodityArt artKey={key} className="h-8 w-8" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[15px] font-bold text-ink">
                    {r.commodityName}
                    {r.varietyName ? ` — ${r.varietyName}` : ""}
                  </span>
                  <Badge tone={rfqStatusTone(r.status)}>{t(`rfq.status.${r.status}`)}</Badge>
                </span>
                <span className="mt-0.5 block text-[13px] text-muted num">
                  {formatQuantity(r.quantity, r.unitSymbol)}
                  {r.cityName ? (
                    <>
                      {" "}
                      · <MapPin className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> {r.cityName}
                    </>
                  ) : null}{" "}
                  · {formatDate(r.createdAt, locale)} · <span className="font-latin">{r.reference}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold num ${r.quoteCount > 0 ? "bg-success-bg text-success" : "bg-surface-2 text-muted"}`}>{t("rfq.offersCount", { count: r.quoteCount })}</span>
                <ChevronRight className="h-4 w-4 text-muted-2 rtl:rotate-180" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
