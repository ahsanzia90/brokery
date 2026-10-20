import type { ReactNode } from "react";
import { cn } from "./cn";

/** Quiet empty state: dashed boundary, small illustration, one clear next action. */
export function EmptyState({ title, body, action, icon, className, compact }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--r-lg)] border border-dashed border-line-strong bg-surface-2/60 px-6 text-center", compact ? "py-8" : "py-12", className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-800 shadow-[var(--shadow-sm)]" aria-hidden>{icon}</div>}
      <h3 className="text-[17px] font-bold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-md text-[14px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
