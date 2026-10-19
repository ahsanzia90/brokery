import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  info: "bg-info-soft border-info/30 text-text",
  success: "bg-primary-soft border-primary/30 text-text",
  warning: "bg-warning-soft border-warning/40 text-text",
  danger: "bg-danger-soft border-danger/30 text-text",
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-[var(--radius)] border px-4 py-3", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn("text-[0.95rem]", title ? "mt-1" : "")}>{children}</div>}
    </div>
  );
}
