"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/validation/common";

export type AdminAction = (payload: Record<string, string>) => Promise<ActionResult<unknown>>;

/**
 * Button that calls a server action with a payload. Optional confirmation dialog,
 * optional required reason (for destructive / audited operations), optional extra select.
 */
export function ActionButton({
  action,
  payload,
  children,
  variant = "outline",
  size = "sm",
  confirm,
  requireReason,
  reasonLabel = "Reason (recorded in the audit log)",
  select,
  successMessage = "Done",
  redirectTo,
}: {
  action: AdminAction;
  payload: Record<string, string>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "sm" | "md";
  confirm?: { title: string; body?: ReactNode };
  requireReason?: boolean;
  reasonLabel?: string;
  select?: { name: string; label: string; options: Array<{ value: string; label: string }>; defaultValue?: string };
  successMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [sel, setSel] = useState(select?.defaultValue ?? select?.options[0]?.value ?? "");

  function run(extra: Record<string, string>) {
    start(async () => {
      const res = await action({ ...payload, ...extra });
      if (res.ok) {
        toast.push(res.message ?? successMessage, "success");
        ref.current?.close();
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else toast.push(res.error === "forbidden" ? "You do not have permission for this action." : res.error, "error");
    });
  }

  const needsDialog = Boolean(confirm || requireReason || select);
  return (
    <>
      <Button type="button" variant={variant} size={size} loading={pending} onClick={() => (needsDialog ? ref.current?.showModal() : run({}))}>
        {children}
      </Button>
      {needsDialog && (
        <dialog ref={ref} className="m-auto w-[min(92vw,460px)] rounded-[var(--r-lg)] border border-line bg-surface p-0 shadow-[var(--shadow-lg)]">
          <form
            method="dialog"
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (requireReason && !reason.trim()) return;
              run({ ...(requireReason || reason ? { reason } : {}), ...(select ? { [select.name]: sel } : {}) });
            }}
          >
            <h2 className="text-[16px] font-semibold text-ink">{confirm?.title ?? String(children)}</h2>
            {confirm?.body && <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{confirm.body}</div>}
            {select && (
              <label className="mt-3 block">
                <span className="adm-label">{select.label}</span>
                <select value={sel} onChange={(e) => setSel(e.target.value)} className="adm-control w-full">
                  {select.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mt-3 block">
              <span className="adm-label">
                {reasonLabel}
                {requireReason ? " *" : " (optional)"}
              </span>
              <textarea required={requireReason} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="adm-control w-full" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" variant={variant === "outline" || variant === "ghost" ? "primary" : variant} size="sm" loading={pending}>
                Confirm
              </Button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

/** Small inline form (textarea/select/inputs) submitting to a server action. */
export function ActionForm({ action, payload, children, submitLabel, variant = "primary", successMessage = "Saved", className }: { action: AdminAction; payload: Record<string, string>; children: ReactNode; submitLabel: string; variant?: "primary" | "outline" | "danger"; successMessage?: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        start(async () => {
          const res = await action({ ...payload, ...data });
          if (res.ok) {
            toast.push(res.message ?? successMessage, "success");
            form.reset();
            router.refresh();
          } else toast.push(res.error === "forbidden" ? "You do not have permission for this action." : res.error, "error");
        });
      }}
    >
      {children}
      <Button type="submit" variant={variant} size="sm" loading={pending} className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
