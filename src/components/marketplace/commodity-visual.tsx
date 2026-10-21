"use client";
import { CommodityArt, artKeyFor, artTint, type ArtKey } from "@/components/illustrations/commodity-art";
import { hasPhoto, photoKeyFor, photoSrc } from "@/lib/visual/photos";
import { useVisualMode } from "@/lib/visual/client";

/**
 * Drop-in replacement for CommodityArt. In photo mode it renders a real photograph when the
 * library has one for this commodity/category; otherwise the illustration. `fill` makes the
 * visual cover its container (tiles, cards); without it the visual is a small inline icon.
 */
export function CommodityVisual({ artKey, slug, name, categorySlug, imagePath, className = "", fill, alt = "", photoKey }: { artKey?: ArtKey; slug?: string | null; name?: string | null; categorySlug?: string | null; imagePath?: string | null; className?: string; fill?: boolean; alt?: string; photoKey?: string }) {
  const mode = useVisualMode();
  const key = artKey ?? artKeyFor(slug, name);
  const photo = mode === "photos" ? (photoKey && hasPhoto(photoKey) ? photoKey : photoKeyFor(slug, name, categorySlug, artKey)) : null;
  const src = imagePath ? `/files/public/${imagePath}` : photo ? photoSrc(photo) : null;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`${fill ? "h-full w-full object-cover" : "rounded-[inherit] object-cover"} ${className}`} />;
  }
  if (fill) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${artTint[key]} ${className}`}>
        <CommodityArt artKey={key} className="h-[56%] w-[56%] opacity-90" />
      </div>
    );
  }
  return <CommodityArt artKey={key} className={className} />;
}

/** True when photo mode is on and the library has this exact photo (for banners that should otherwise disappear). */
export function usePhoto(key: string): string | null {
  const mode = useVisualMode();
  return mode === "photos" && hasPhoto(key) ? photoSrc(key) : null;
}

/** Full-bleed banner photo that renders nothing when unavailable. */
export function PhotoBanner({ photoKey, className = "", alt = "" }: { photoKey: string; className?: string; alt?: string }) {
  const src = usePhoto(photoKey);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />;
}
