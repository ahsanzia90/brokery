"use client";
import type { ReactNode } from "react";

/** Wraps the two hero panels and records which action was taken (privacy-friendly beacon). */
export function HeroActions({ children }: { children: ReactNode }) {
  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
    const name = el?.dataset.track;
    if (!name) return;
    try {
      navigator.sendBeacon?.("/api/events", new Blob([JSON.stringify({ name })], { type: "application/json" }));
    } catch {}
  }
  return (
    <div onClick={onClick} className="mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-2 md:gap-5">
      {children}
    </div>
  );
}
