import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius)] border transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white border-primary hover:bg-primary-strong",
  secondary: "bg-primary-soft text-primary-strong border-primary-soft hover:bg-[#d4e8da]",
  outline: "bg-surface text-text border-border-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-text border-transparent hover:bg-surface-muted",
  danger: "bg-danger text-white border-danger hover:bg-[#8f1c13]",
  accent: "bg-accent text-white border-accent hover:bg-[#966218]",
};
const sizes: Record<Size, string> = {
  sm: "min-h-[40px] px-3 text-sm",
  md: "min-h-[48px] px-4 text-base",
  lg: "min-h-[56px] px-6 text-lg",
  xl: "min-h-[64px] px-7 text-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; children: ReactNode };

export function Button({ variant = "primary", size = "md", className, loading, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode };

export function LinkButton({ variant = "primary", size = "md", className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
