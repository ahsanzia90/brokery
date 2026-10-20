import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Pill link used for varieties, cities, related commodities and quick filters. */
export function Chip({ href, children, active, count, size = "md", className }: { href: string; children: ReactNode; active?: boolean; count?: number | null; size?: "sm" | "md"; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors",
        size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-[14px]",
        active ? "border-brand-800 bg-brand-800 text-white" : "border-line bg-surface text-ink-2 hover:border-brand-700 hover:text-brand-900",
        className,
      )}
    >
      {children}
      {typeof count === "number" && count > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-bold num", active ? "bg-white/20 text-white" : "bg-surface-2 text-muted")}>{count}</span>}
    </Link>
  );
}

export function ChipRow({ children, className, scroll }: { children: ReactNode; className?: string; scroll?: boolean }) {
  return <ul className={cn(scroll ? "scroll-x -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:overflow-visible" : "flex flex-wrap gap-2", className)}>{children}</ul>;
}
