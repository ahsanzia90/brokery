"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";

/** Accessible confirmation dialog for destructive actions. */
export function ConfirmButton({
  children,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = "danger",
  requireReason,
  reasonLabel,
}: {
  children: ReactNode;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (reason?: string) => Promise<void> | void;
  variant?: "danger" | "primary" | "outline";
  requireReason?: boolean;
  reasonLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const id = useId();
  return (
    <>
      <Button type="button" variant={variant === "danger" ? "outline" : variant} size="sm" onClick={() => ref.current?.showModal()}>
        {children}
      </Button>
      <dialog ref={ref} className="m-auto w-[min(92vw,460px)] rounded-[var(--r-lg)] border border-line bg-surface p-0 shadow-[var(--shadow-lg)]" aria-labelledby={id}>
        <form
          method="dialog"
          className="p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (requireReason && !reason.trim()) return;
            setBusy(true);
            try {
              await onConfirm(reason.trim() || undefined);
              ref.current?.close();
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 id={id} className="text-[18px] font-bold text-ink">
            {title}
          </h2>
          {body && <div className="mt-2 text-[14px] text-muted">{body}</div>}
          {requireReason && (
            <label className="mt-3 block">
              <span className="block text-sm font-semibold">{reasonLabel ?? "Reason"}</span>
              <textarea required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-[var(--r-sm)] border border-line-strong p-2 text-[14px]" rows={3} />
            </label>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant={variant} loading={busy}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
