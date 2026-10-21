import { CommodityVisual } from "@/components/marketplace/commodity-visual";
import type { ReactNode } from "react";
import { artKeyFor, artTint, type ArtKey } from "@/components/illustrations/commodity-art";
import { cn } from "@/components/ui/cn";

/**
 * Tinted hero band for category / commodity / location pages.
 * Left: artwork tile (or uploaded image). Right: eyebrow, title, alt name, intro, actions.
 */
export function PageHero({ eyebrow, title, altName, intro, actions, imagePath, artKey, slug, name, aside, tint, children }: { eyebrow?: ReactNode; title: ReactNode; altName?: string | null; intro?: ReactNode; actions?: ReactNode; imagePath?: string | null; artKey?: ArtKey; slug?: string | null; name?: string | null; aside?: ReactNode; tint?: string; children?: ReactNode }) {
  const key = artKey ?? artKeyFor(slug, name);
  const bg = tint ?? artTint[key];
  return (
    <section className={cn("rounded-[var(--r-xl)] p-5 md:p-8", bg)}>
      <div className="grid grid-cols-[auto_1fr] items-start gap-4 md:gap-7 md:items-center">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[var(--r-md)] bg-white/60 md:h-40 md:w-40 md:rounded-[var(--r-lg)]">
          <CommodityVisual fill imagePath={imagePath} artKey={key} slug={slug} name={name} />
        </div>
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0">
            <h1 className="text-[28px] font-extrabold leading-tight text-ink md:text-[40px]">{title}</h1>
            {altName && (
              <span className="text-[17px] text-muted md:text-[20px]" dir="auto">
                {altName}
              </span>
            )}
          </div>
          {intro && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2 md:text-[16px]">{intro}</p>}
          {actions && <div className="mt-5 hidden flex-wrap items-center gap-3 md:flex">{actions}</div>}
          <div className="hidden md:block">{children}</div>
        </div>
        {aside}
      </div>
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2 md:hidden">{actions}</div>}
      <div className="md:hidden">{children}</div>
    </section>
  );
}
