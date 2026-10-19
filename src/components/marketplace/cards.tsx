import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import { formatNumber, formatPKR, formatDate, daysBetween } from "@/lib/utils/format";
import { Badge, verificationTone } from "@/components/ui/badge";

/* ---------- Shared view models (plain objects; safe to pass to client components) ---------- */
export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  commodityName: string;
  varietyName?: string | null;
  priceType: "fixed" | "negotiable" | "quote" | "on_contact";
  priceAmount: string | null;
  priceUnitSymbol?: string | null;
  quantity: string;
  unitSymbol: string;
  cityName?: string | null;
  imagePath?: string | null;
  businessName: string;
  businessSlug: string;
  verificationLevel: string;
  publishedAt: Date | string | null;
};

export type SupplierCardData = {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  cityName?: string | null;
  verificationLevel: string;
  logoPath?: string | null;
  listingCount: number;
  commodities: string[];
};

export type PriceRowData = {
  id: string;
  commodityName: string;
  commoditySlug: string;
  varietyName?: string | null;
  gradeName?: string | null;
  locationName: string;
  locationSlug?: string | null;
  amount: string;
  lowAmount?: string | null;
  highAmount?: string | null;
  unitSymbol: string;
  priceType: string;
  observationDate: string;
  sourceName?: string | null;
  changePercent?: string | null;
  isStale: boolean;
};

export type CategoryCardData = { slug: string; nameEn: string; nameUr: string | null; icon?: string | null; imagePath?: string | null; count?: number };

export function priceLabel(t: Translator, l: { priceType: ListingCardData["priceType"]; priceAmount: string | null; priceUnitSymbol?: string | null }): string {
  if (l.priceType === "fixed" || l.priceType === "negotiable") {
    if (l.priceAmount) return `${formatPKR(l.priceAmount)}${l.priceUnitSymbol ? ` / ${l.priceUnitSymbol}` : ""}${l.priceType === "negotiable" ? ` · ${t("price.negotiable")}` : ""}`;
    return l.priceType === "negotiable" ? t("price.negotiable") : t("price.onContact");
  }
  if (l.priceType === "quote") return t("price.quote");
  return t("price.onContact");
}

export function ListingCard({ l, t }: { l: ListingCardData; t: Translator }) {
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <Link href={`/listings/${l.slug}`} className="block">
        {l.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${l.imagePath}`} alt={l.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted text-5xl" aria-hidden>
            📦
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-sm text-text-muted">
          {l.commodityName}
          {l.varietyName ? ` · ${l.varietyName}` : ""}
        </p>
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">
          <Link href={`/listings/${l.slug}`} className="hover:text-primary">
            {l.title}
          </Link>
        </h3>
        <p className="font-semibold text-primary-strong num">{priceLabel(t, l)}</p>
        <p className="text-[0.95rem] text-text-muted num">
          {t("common.quantity")}: {formatNumber(l.quantity)} {l.unitSymbol}
          {l.cityName ? ` · ${l.cityName}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-sm">
          <Link href={`/supplier/${l.businessSlug}`} className="font-medium hover:underline">
            {l.businessName}
          </Link>
          <Badge tone={verificationTone(l.verificationLevel)}>{t(`supplier.verification.${l.verificationLevel}`)}</Badge>
        </div>
      </div>
    </article>
  );
}

export function SupplierCard({ s, t }: { s: SupplierCardData; t: Translator }) {
  return (
    <article className="card flex h-full flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        {s.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${s.logoPath}`} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-xl font-bold text-primary-strong" aria-hidden>
            {s.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">
            <Link href={`/supplier/${s.slug}`} className="hover:text-primary">
              {s.name}
            </Link>
          </h3>
          <p className="text-sm text-text-muted">{s.cityName ?? ""}</p>
        </div>
      </div>
      <Badge tone={verificationTone(s.verificationLevel)} className="self-start">
        {t(`supplier.verification.${s.verificationLevel}`)}
      </Badge>
      {s.commodities.length > 0 && <p className="line-clamp-2 text-[0.95rem] text-text-muted">{s.commodities.join(" · ")}</p>}
      <p className="mt-auto text-sm text-text-muted num">
        {s.listingCount} {t("common.listings").toLowerCase()}
      </p>
    </article>
  );
}

export function PriceRow({ p, t, locale, staleDays }: { p: PriceRowData; t: Translator; locale: Locale; staleDays: number }) {
  return (
    <div className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-bold">
          <Link href={`/prices/${p.commoditySlug}`} className="hover:text-primary">
            {p.commodityName}
            {p.varietyName ? ` — ${p.varietyName}` : ""}
            {p.gradeName ? ` (${p.gradeName})` : ""}
          </Link>
        </h3>
        <p className="text-sm text-text-muted">
          {t("common.market")}: {p.locationName} · {t(`price.type.${p.priceType}`)}
        </p>
        <p className="text-sm text-text-muted">
          {t("common.updated")}: <span className="num">{formatDate(p.observationDate, locale)}</span>
          {p.sourceName ? ` · ${t("common.source")}: ${p.sourceName}` : ""}
          {p.isStale && (
            <Badge tone="warning" className="ms-2" title={t("price.staleNote", { days: staleDays })}>
              {t("price.stale")}
            </Badge>
          )}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <p className="text-xl font-extrabold text-primary-strong num">
          {formatPKR(p.amount)} <span className="text-sm font-semibold text-text-muted">/ {p.unitSymbol}</span>
          {p.changePercent && Number(p.changePercent) !== 0 && (
            <span className={`ms-2 text-sm ${Number(p.changePercent) > 0 ? "text-danger" : "text-primary"}`}>
              {Number(p.changePercent) > 0 ? "▲" : "▼"} {Math.abs(Number(p.changePercent)).toFixed(1)}%
            </span>
          )}
        </p>
        {p.lowAmount && p.highAmount && (
          <p className="text-sm text-text-muted num">
            {t("price.range")}: {formatNumber(p.lowAmount)}–{formatNumber(p.highAmount)}
          </p>
        )}
        <Link href={`/commodities/${p.commoditySlug}${p.locationSlug ? `/city/${p.locationSlug}` : ""}`} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
          {t("action.findSuppliers")} ›
        </Link>
      </div>
    </div>
  );
}

export function CategoryCard({ c, locale, href }: { c: CategoryCardData; locale: Locale; href?: string }) {
  const name = locale === "ur" && c.nameUr ? c.nameUr : c.nameEn;
  return (
    <Link href={href ?? `/categories/${c.slug}`} className="card flex min-h-[112px] flex-col items-center justify-center gap-2 p-4 text-center hover:border-primary hover:shadow-md">
      {c.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/files/public/${c.imagePath}`} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
      ) : (
        <span className="text-3xl" aria-hidden>
          {c.icon ?? "📦"}
        </span>
      )}
      <span className="font-semibold leading-tight">{name}</span>
      {typeof c.count === "number" && c.count > 0 && <span className="text-xs text-text-muted num">{c.count}</span>}
    </Link>
  );
}

export function isStale(observationDate: string | Date, staleDays: number): boolean {
  return daysBetween(new Date(), new Date(observationDate)) > staleDays;
}
