"use client";
import { useState } from "react";
import { CommodityArt, artKeyFor, artTint } from "@/components/illustrations/commodity-art";

export function ImageGallery({ images, commoditySlug, commodityName }: { images: Array<{ src: string; alt: string }>; commoditySlug?: string | null; commodityName?: string | null }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    const key = artKeyFor(commoditySlug, commodityName);
    return (
      <div className={`flex aspect-[16/10] w-full items-center justify-center rounded-[var(--r-lg)] md:aspect-[4/3] ${artTint[key]}`} aria-hidden>
        <CommodityArt artKey={key} className="h-[48%] w-[48%]" />
      </div>
    );
  }
  const cur = images[Math.min(active, images.length - 1)];
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur.src} alt={cur.alt} className="aspect-[4/3] w-full rounded-[var(--r-lg)] border border-line bg-surface-2 object-cover" />
      {images.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto" aria-label="More photos">
          {images.map((im, i) => (
            <li key={im.src}>
              <button type="button" onClick={() => setActive(i)} aria-pressed={i === active} className={`block h-16 w-20 overflow-hidden rounded-[var(--r-sm)] border-2 ${i === active ? "border-brand-800" : "border-transparent opacity-80 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
