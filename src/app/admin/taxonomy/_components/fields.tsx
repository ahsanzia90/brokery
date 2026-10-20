import type { ReactNode } from "react";

const cls = "mt-1 w-full rounded-[var(--radius)] border border-line-strong bg-surface px-3 py-2 min-h-[44px]";

export function F({ label, name, value, type = "text", required, help, dir, placeholder }: { label: string; name: string; value?: string | number | null; type?: string; required?: boolean; help?: string; dir?: "rtl" | "ltr"; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input name={name} type={type} defaultValue={value ?? ""} required={required} dir={dir} placeholder={placeholder} className={cls} />
      {help && <span className="block text-xs text-muted">{help}</span>}
    </label>
  );
}

export function TA({ label, name, value, rows = 3, help, dir }: { label: string; name: string; value?: string | null; rows?: number; help?: string; dir?: "rtl" | "ltr" }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold">{label}</span>
      <textarea name={name} defaultValue={value ?? ""} rows={rows} dir={dir} className={cls} />
      {help && <span className="block text-xs text-muted">{help}</span>}
    </label>
  );
}

export function Sel({ label, name, value, options, help, allowEmpty }: { label: string; name: string; value?: string | null; options: Array<{ value: string; label: string }>; help?: string; allowEmpty?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold">{label}</span>
      <select name={name} defaultValue={value ?? ""} className={cls}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <span className="block text-xs text-muted">{help}</span>}
    </label>
  );
}

export function Cb({ label, name, checked, help }: { label: string; name: string; checked?: boolean; help?: string }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-5 w-5" />
      <span>
        <span className="font-semibold">{label}</span>
        {help && <span className="block text-xs text-muted">{help}</span>}
      </span>
    </label>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-4 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{children}</div>;
}

export const LISTING_KIND_OPTIONS = ["commodity", "agricultural_input", "industrial_material", "equipment", "livestock", "other"].map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
export const MODERATION_OPTIONS = [
  { value: "auto", label: "auto — publish immediately" },
  { value: "review", label: "review — admin review before publishing" },
  { value: "restricted", label: "restricted — documents + admin review required" },
  { value: "prohibited", label: "prohibited — cannot be listed" },
];
