import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "./cn";

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "bg-info-bg text-ink", Icon: Info },
  success: { cls: "bg-success-bg text-ink", Icon: CheckCircle2 },
  warning: { cls: "bg-warning-bg text-ink", Icon: TriangleAlert },
  danger: { cls: "bg-danger-bg text-ink", Icon: AlertCircle },
};
const iconColor: Record<Tone, string> = { info: "text-info", success: "text-success", warning: "text-warning", danger: "text-danger" };

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--r-md)] px-4 py-3", cls, className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor[tone])} aria-hidden />
      <div className="min-w-0 text-[14px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-ink-2" : ""}>{children}</div>}
      </div>
    </div>
  );
}
