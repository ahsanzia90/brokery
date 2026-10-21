"use client";
import Link from "next/link";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";
import { photoKeyFor, photoSrc } from "@/lib/visual/photos";
import { useVisualMode } from "@/lib/visual/client";

export type CategoryTileData = { slug: string; name: string; nameEn: string; imagePath?: string | null; count?: number; countLabel?: string };

/**
 * Category tile. Illustration mode: tinted tile with artwork. Photo mode (or an uploaded
 * image): full-bleed photograph with a dark gradient and a large white label, so the picture
 * itself identifies the category for people who read little.
 */
export function CategoryTile({ c, href }: { c: CategoryTileData; href?: string }) {
  const mode = useVisualMode();
  const key = artKeyFor(c.slug, c.nameEn);
  const photo = c.imagePath ? `/files/public/${c.imagePath}` : mode === "photos" ? (() => { const k = photoKeyFor(c.slug, c.nameEn); return k && k !== "generic" ? photoSrc(k) : null; })() : null;
  const base = "group relative flex min-h-[164px] flex-col justify-end overflow-hidden rounded-[var(--r-lg)] p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]";
  if (photo) {
    return (
      <Link href={href ?? `/categories/${c.slug}`} className={`${base} min-h-[180px] bg-ink`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" aria-hidden />
        <span className="relative">
          <span className="block text-[18px] font-bold leading-tight text-white drop-shadow">{c.name}</span>
          {typeof c.count === "number" && c.count > 0 && <span className="mt-0.5 block text-[13px] text-white/85 num">{c.count} {c.countLabel ?? ""}</span>}
        </span>
      </Link>
    );
  }
  return (
    <Link href={href ?? `/categories/${c.slug}`} className={`${base} pt-[92px] ${artTint[key]}`}>
      <CommodityArt artKey={key} className="absolute -end-2 -top-1 h-[96px] w-[96px] opacity-95 transition-transform duration-500 group-hover:scale-105 rtl:-start-2 rtl:end-auto" />
      <span className="relative">
        <span className="block text-[15px] font-bold leading-tight text-ink">{c.name}</span>
        {typeof c.count === "number" && c.count > 0 && <span className="mt-0.5 block text-[12px] text-muted num">{c.count} {c.countLabel ?? ""}</span>}
      </span>
    </Link>
  );
}
