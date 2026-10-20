import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import { formatNumber, formatPKR, formatDate, daysBetween } from "@/lib/utils/format";
import { Badge, verificationTone } from "@/components/ui/badge";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";

/* ---------- Shared view models (plain objects; safe to pass to client components) ---------- */
export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  commodityName: string;
  commoditySlug?: string | null;
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

/** Listing image or a tinted illustration placeholder for the commodity. */
export function ListingMedia({ imagePath, alt, commoditySlug, commodityName, className = "" }: { imagePath?: string | null; alt: string; commoditySlug?: string | null; commodityName?: string | null; className?: string }) {
  if (imagePath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/files/public/${imagePath}`} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const key = artKeyFor(commoditySlug, commodityName);
  return (
    <div className={`flex h-full w-full items-center justify-center ${artTint[key]} ${className}`}>
      <CommodityArt artKey={key} className="h-[56%] w-[56%] opacity-90" />
    </div>
  );
}

export function ListingCard({ l, t }: { l: ListingCardData; t: Translator }) {
  const isNew = l.publishedAt ? daysBetween(new Date(), new Date(l.publishedAt)) <= 3 : false;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <Link href={`/listings/${l.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <ListingMedia imagePath={l.imagePath} alt={l.title} commoditySlug={l.commoditySlug} commodityName={l.commodityName} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        {isNew && <span className="absolute start-3 top-3 rounded-full bg-lime-500 px-2 py-0.5 text-[12px] font-bold text-brand-950">{t("common.new")}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
          {l.commodityName}
          {l.varietyName ? <span className="text-muted"> · {l.varietyName}</span> : null}
        </p>
        <h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-ink">
          <Link href={`/listings/${l.slug}`} className="hover:text-brand-800">
            {l.title}
          </Link>
        </h3>
        <p className="mt-1 text-[16px] font-extrabold text-ink num">{priceLabel(t, l)}</p>
        <p className="flex items-center gap-1 text-[13px] text-muted num">
          <span>{formatNumber(l.quantity)} {l.unitSymbol}</span>
          {l.cityName && (
            <>
              <span aria-hidden>·</span>
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {l.cityName}
            </>
          )}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
          <Link href={`/supplier/${l.businessSlug}`} className="truncate font-semibold text-ink-2 hover:text-brand-800">
            {l.businessName}
          </Link>
          <VerificationLabel level={l.verificationLevel} t={t} compact />
        </div>
      </div>
    </article>
  );
}

export function VerificationLabel({ level, t, compact }: { level: string; t: Translator; compact?: boolean }) {
  if (level === "none" && compact) return <span className="text-[12px] text-muted-2">{t("supplier.verification.none")}</span>;
  return (
    <Badge tone={verificationTone(level)} className={compact ? "text-[12px]" : ""}>
      {level !== "none" && <ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
      {t(`supplier.verification.${level}`)}
    </Badge>
  );
}

export function SupplierCard({ s, t }: { s: SupplierCardData; t: Translator }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-3">
        {s.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/files/public/${s.logoPath}`} alt="" className="h-12 w-12 rounded-[var(--r-sm)] object-cover" loading="lazy" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] bg-brand-900 text-[18px] font-extrabold text-lime-400" aria-hidden>
            {s.name.replace(/^\[sample\]\s*/i, "").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-ink">
            <Link href={`/supplier/${s.slug}`} className="hover:text-brand-800">
              {s.name}
            </Link>
          </h3>
          <p className="flex items-center gap-1 text-[13px] text-muted">
            {s.cityName && (
              <>
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {s.cityName}
              </>
            )}
          </p>
        </div>
      </div>
      <VerificationLabel level={s.verificationLevel} t={t} />
      {s.commodities.length > 0 && <p className="line-clamp-2 text-[14px] text-ink-2">{s.commodities.join(" · ")}</p>}
      <p className="mt-auto text-[13px] text-muted num">
        {s.listingCount} {t("common.listings").toLowerCase()}
      </p>
    </article>
  );
}

export function ChangeBadge({ value }: { value: string | null | undefined }) {
  const n = Number(value);
  if (!value || !Number.isFinite(n) || n === 0) return null;
  const up = n > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold num ${up ? "text-danger" : "text-success"}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
      {Math.abs(n).toFixed(1)}%
    </span>
  );
}

export function PriceRow({ p, t, locale, staleDays }: { p: PriceRowData; t: Translator; locale: Locale; staleDays: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-md)] border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-[16px] font-bold text-ink">
          <Link href={`/prices/${p.commoditySlug}`} className="hover:text-brand-800">
            {p.commodityName}
            {p.varietyName ? ` — ${p.varietyName}` : ""}
            {p.gradeName ? ` (${p.gradeName})` : ""}
          </Link>
        </h3>
        <p className="mt-0.5 text-[13px] text-muted">
          {p.locationName} · {t(`price.type.${p.priceType}`)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
          <span className="num">{formatDate(p.observationDate, locale)}</span>
          {p.sourceName ? <span>· {p.sourceName}</span> : null}
          {p.isStale && (
            <Badge tone="warning" title={t("price.staleNote", { days: staleDays })}>
              {t("price.stale")}
            </Badge>
          )}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
        <p className="text-[20px] font-extrabold text-ink num">
          {formatPKR(p.amount)} <span className="text-[13px] font-semibold text-muted">/ {p.unitSymbol}</span>
          <ChangeBadge value={p.changePercent} />
        </p>
        {p.lowAmount && p.highAmount && (
          <p className="text-[12px] text-muted num">
            {t("price.range")}: {formatNumber(p.lowAmount)}–{formatNumber(p.highAmount)}
          </p>
        )}
        <Link href={`/commodities/${p.commoditySlug}${p.locationSlug ? `/city/${p.locationSlug}` : ""}`} className="text-[13px] font-semibold text-brand-800 hover:underline">
          {t("action.findSuppliers")} ›
        </Link>
      </div>
    </div>
  );
}

/** Compact ticker chip used in the "Aaj ke rate" strip. */
export function RateChip({ p, locale }: { p: PriceRowData; locale: Locale }) {
  return (
    <Link href={`/prices/${p.commoditySlug}`} className="flex min-w-[200px] flex-col gap-0.5 rounded-[var(--r-md)] border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
      <span className="truncate text-[13px] font-semibold text-white/85">
        {p.commodityName}
        {p.varietyName ? ` · ${p.varietyName}` : ""}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-[18px] font-extrabold text-white num">{formatPKR(p.amount)}</span>
        <span className="text-[12px] text-white/60">/ {p.unitSymbol}</span>
        <ChangeBadge value={p.changePercent} />
      </span>
      <span className="text-[12px] text-white/55 num">
        {p.locationName} · {formatDate(p.observationDate, locale)}
      </span>
    </Link>
  );
}

export function CategoryCard({ c, locale, href }: { c: CategoryCardData; locale: Locale; href?: string }) {
  const name = locale === "ur" && c.nameUr ? c.nameUr : c.nameEn;
  const key = artKeyFor(c.slug, c.nameEn);
  return (
    <Link href={href ?? `/categories/${c.slug}`} className={`group relative flex min-h-[164px] flex-col justify-end overflow-hidden rounded-[var(--r-lg)] p-4 pt-[92px] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${c.imagePath ? "bg-ink" : artTint[key]}`}>
      {c.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/files/public/${c.imagePath}`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
      ) : (
        <CommodityArt artKey={key} className="absolute -end-2 -top-1 h-[96px] w-[96px] opacity-95 transition-transform duration-500 group-hover:scale-105 rtl:-start-2 rtl:end-auto" />
      )}
      {c.imagePath && <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden />}
      <span className="relative">
        <span className={`block text-[15px] font-bold leading-tight ${c.imagePath ? "text-white" : "text-ink"}`}>{name}</span>
        {typeof c.count === "number" && c.count > 0 && <span className={`mt-0.5 block text-[12px] num ${c.imagePath ? "text-white/80" : "text-muted"}`}>{c.count} {c.count === 1 ? "listing" : "listings"}</span>}
      </span>
    </Link>
  );
}

export function isStale(observationDate: string | Date, staleDays: number): boolean {
  return daysBetween(new Date(), new Date(observationDate)) > staleDays;
}
