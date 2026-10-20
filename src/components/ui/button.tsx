import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger" | "dark" | "link";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--r-sm)] border transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px";
const variants: Record<Variant, string> = {
  primary: "bg-brand-800 text-white border-brand-800 hover:bg-brand-900 hover:border-brand-900 shadow-[var(--shadow-xs)]",
  accent: "bg-lime-500 text-brand-950 border-lime-500 hover:bg-lime-400 hover:border-lime-400",
  secondary: "bg-brand-50 text-brand-900 border-brand-50 hover:bg-brand-100 hover:border-brand-100",
  outline: "bg-surface text-ink border-line-strong hover:bg-surface-2 hover:border-muted-2",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white border-danger hover:bg-[#a52f23] hover:border-[#a52f23]",
  dark: "bg-ink text-white border-ink hover:bg-black",
  link: "bg-transparent text-brand-800 border-transparent underline underline-offset-4 hover:text-brand-900 px-0",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-6 text-base",
  xl: "h-14 px-7 text-[17px] rounded-[var(--r-md)]",
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
