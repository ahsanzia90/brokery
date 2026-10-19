"use client";
import { useState } from "react";

export function ImageGallery({ images }: { images: Array<{ src: string; alt: string }> }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface-muted text-6xl" aria-hidden>
        📦
      </div>
    );
  }
  const cur = images[Math.min(active, images.length - 1)];
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur.src} alt={cur.alt} className="aspect-[4/3] w-full rounded-[var(--radius-lg)] border border-border object-cover" />
      {images.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto" aria-label="More photos">
          {images.map((im, i) => (
            <li key={im.src}>
              <button type="button" onClick={() => setActive(i)} aria-pressed={i === active} className={`block h-16 w-20 overflow-hidden rounded-[8px] border-2 ${i === active ? "border-primary" : "border-border"}`}>
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
