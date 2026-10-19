import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "primary";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-muted border-border",
  success: "bg-primary-soft text-primary-strong border-primary-soft",
  warning: "bg-warning-soft text-warning border-warning-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
  info: "bg-info-soft text-info border-info-soft",
  accent: "bg-accent-soft text-accent border-accent-soft",
  primary: "bg-primary text-white border-primary",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold leading-6", tones[tone], className)}>
      {children}
    </span>
  );
}

export function listingStatusTone(status: string): Tone {
  switch (status) {
    case "published":
      return "success";
    case "pending_review":
      return "warning";
    case "rejected":
    case "removed":
      return "danger";
    case "paused":
    case "expired":
    case "sold_out":
      return "neutral";
    default:
      return "info";
  }
}

export function verificationTone(level: string): Tone {
  switch (level) {
    case "admin_verified":
      return "success";
    case "documents_reviewed":
      return "info";
    case "phone_verified":
      return "accent";
    default:
      return "neutral";
  }
}

export function rfqStatusTone(status: string): Tone {
  switch (status) {
    case "responses_received":
    case "in_discussion":
      return "success";
    case "matching":
    case "submitted":
      return "info";
    case "closed":
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}
