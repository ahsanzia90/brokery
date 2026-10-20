import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Label({ children, required, hint, className, ...rest }: ComponentProps<"label"> & { required?: boolean; hint?: string }) {
  return (
    <label className={cn("mb-2 block text-[15px] font-semibold text-ink", className)} {...rest}>
      {children}
      {required && <span className="ms-1 text-danger" aria-hidden>*</span>}
      {hint && <span className="mt-1 block text-[14px] font-normal leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full h-12 rounded-[var(--r-sm)] border border-line-strong bg-surface px-4 text-[16px] text-ink shadow-[var(--shadow-xs)] placeholder:text-muted-2 transition-[border-color,box-shadow] focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-800/10 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10 disabled:bg-surface-2 disabled:text-muted";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-[132px] py-3 leading-relaxed", className)} {...rest} />;
}

const chevron =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368746d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")";

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "cursor-pointer appearance-none bg-no-repeat pe-10", className)} style={{ backgroundImage: chevron }} {...rest}>
      {children}
    </select>
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-[14px] font-medium text-danger">
      {children}
    </p>
  );
}

export function Field({ label, required, hint, error, children, htmlFor, className }: { label: ReactNode; required?: boolean; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("mb-7", className)}>
      <Label htmlFor={htmlFor} required={required} hint={hint}>
        {label}
      </Label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex min-h-[48px] cursor-pointer items-start gap-3 py-1", className)}>
      <input type="checkbox" className="mt-[3px] h-[18px] w-[18px] shrink-0 rounded accent-[var(--brand-800)]" {...rest} />
      <span className="text-[15px] leading-snug text-ink-2">{label}</span>
    </label>
  );
}

export function RadioCard({ label, description, className, ...rest }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex min-h-[64px] cursor-pointer items-start gap-3 rounded-[var(--r-md)] border border-line bg-surface p-4 transition-colors hover:border-line-strong has-[:checked]:border-brand-800 has-[:checked]:bg-brand-50 has-[:checked]:ring-1 has-[:checked]:ring-brand-800", className)}>
      <input type="radio" className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[var(--brand-800)]" {...rest} />
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-1 block text-[14px] leading-relaxed text-muted">{description}</span>}
      </span>
    </label>
  );
}
