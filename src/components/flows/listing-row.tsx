import Link from "next/link";
import { Eye, MapPin, PhoneCall } from "lucide-react";
import type { Translator } from "@/lib/i18n/translate";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { ListingMedia, priceLabel } from "@/components/marketplace/cards";
import { formatNumber } from "@/lib/utils/format";

export type SellerListingRowData = {
  id: string;
  title: string;
  status: string;
  statusReason?: string | null;
  priceType: "fixed" | "negotiable" | "quote" | "on_contact";
  priceAmount: string | null;
  priceUnitSymbol?: string | null;
  quantity: string;
  unitSymbol: string;
  cityName?: string | null;
  commodityName: string;
  commoditySlug?: string | null;
  image?: string | null;
  viewCount?: number;
  contactClickCount?: number;
  slug?: string;
};

/** Dense row for seller lists: thumbnail · title/meta · status · metrics · actions slot. */
export function SellerListingRow({ l, t, actions, href }: { l: SellerListingRowData; t: Translator; actions?: React.ReactNode; href: string }) {
  return (
    <li className="flex gap-3 py-3.5 sm:items-center">
      <Link href={href} className="block h-16 w-20 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-line">
        <ListingMedia imagePath={l.image} alt="" commoditySlug={l.commoditySlug} commodityName={l.commodityName} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={href} className="truncate text-[15px] font-bold text-ink hover:text-brand-800">
            {l.title}
          </Link>
          <Badge tone={listingStatusTone(l.status)}>{t(`listing.status.${l.status}`)}</Badge>
        </div>
        <p className="mt-0.5 text-[13px] text-muted num">
          {formatNumber(l.quantity)} {l.unitSymbol} · {priceLabel(t, l)}
          {l.cityName ? (
            <>
              {" "}
              · <MapPin className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> {l.cityName}
            </>
          ) : null}
        </p>
        {l.statusReason && (l.status === "rejected" || l.status === "draft") && <p className="mt-1 text-[13px] text-danger">{l.statusReason}</p>}
        <p className="mt-1 flex items-center gap-3 text-[12px] text-muted-2 num sm:hidden">
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {l.viewCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5" /> {l.contactClickCount ?? 0}</span>
        </p>
      </div>
      <div className="hidden w-28 shrink-0 text-end text-[12px] text-muted num sm:block">
        <span className="inline-flex items-center gap-1" title={t("listing.views")}><Eye className="h-3.5 w-3.5" /> {l.viewCount ?? 0}</span>
        <span className="ms-3 inline-flex items-center gap-1" title={t("listing.contacts")}><PhoneCall className="h-3.5 w-3.5" /> {l.contactClickCount ?? 0}</span>
      </div>
      {actions && <div className="shrink-0 self-center">{actions}</div>}
    </li>
  );
}
