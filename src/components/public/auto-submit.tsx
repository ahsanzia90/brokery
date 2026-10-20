"use client";
import { useRef, type ReactNode } from "react";

/** GET form that submits itself when a select changes (text inputs still need Enter/Apply). */
export function AutoSubmitForm({ action, className, children, id }: { action: string; className?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      id={id}
      method="get"
      action={action}
      className={className}
      onChange={(e) => {
        const el = e.target as HTMLElement;
        if (el.tagName === "SELECT" || (el as HTMLInputElement).type === "checkbox") ref.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
