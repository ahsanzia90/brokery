import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Label({ children, required, hint, className, ...rest }: ComponentProps<"label"> & { required?: boolean; hint?: string }) {
  return (
    <label className={cn("block text-base font-semibold text-text mb-1.5", className)} {...rest}>
      {children}
      {required && <span className="text-danger ms-1" aria-hidden>*</span>}
      {hint && <span className="block text-sm font-normal text-text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full min-h-[48px] rounded-[var(--radius)] border border-border-strong bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-danger";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-[120px]", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "pe-10 appearance-none bg-no-repeat", className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c6157' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")" }} {...rest}>
      {children}
    </select>
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function Field({ label, required, hint, error, children, htmlFor }: { label: ReactNode; required?: boolean; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-5">
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
    <label className={cn("flex items-start gap-3 min-h-[44px] cursor-pointer", className)}>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" {...rest} />
      <span className="text-base">{label}</span>
    </label>
  );
}

export function RadioCard({ label, description, className, ...rest }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-3.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft min-h-[56px]", className)}>
      <input type="radio" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" {...rest} />
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-text-muted">{description}</span>}
      </span>
    </label>
  );
}
