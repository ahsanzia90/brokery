import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "primary" | "lavender";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  accent: "bg-lime-100 text-lime-900",
  primary: "bg-brand-800 text-white",
  lavender: "bg-tint-lavender text-[#4b3fa8]",
};

/** Soft chip, like the reference tables: tinted background, no border, 13px semibold. */
export function Badge({ tone = "neutral", children, className, title, dot }: { tone?: Tone; children: ReactNode; className?: string; title?: string; dot?: boolean }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[13px] font-semibold leading-5 whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function listingStatusTone(status: string): Tone {
  switch (status) {
    case "published": return "success";
    case "pending_review": return "warning";
    case "rejected": case "removed": return "danger";
    case "paused": case "expired": case "sold_out": return "neutral";
    default: return "info";
  }
}
export function verificationTone(level: string): Tone {
  switch (level) {
    case "admin_verified": return "success";
    case "documents_reviewed": return "info";
    case "phone_verified": return "accent";
    default: return "neutral";
  }
}
export function rfqStatusTone(status: string): Tone {
  switch (status) {
    case "responses_received": case "in_discussion": return "success";
    case "matching": case "submitted": return "info";
    default: return "neutral";
  }
}
