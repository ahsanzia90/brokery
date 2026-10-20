import type { ReactNode } from "react";

const TINTS = ["panel-sky", "panel-mint", "panel-lavender", "panel-peach", "panel-sand"];

/** Numbered "01. / 02. / 03." panels in the reference style. */
export function StepPanel({ n, title, body, children, tint, className = "" }: { n: number; title: ReactNode; body?: ReactNode; children?: ReactNode; tint?: string; className?: string }) {
  return (
    <li className={`panel ${tint ?? TINTS[(n - 1) % TINTS.length]} flex min-w-0 flex-col ${className}`}>
      <span className="step-no">{String(n).padStart(2, "0")}.</span>
      <h2 className="mt-1 text-[22px] font-extrabold leading-tight text-ink md:text-[26px]">{title}</h2>
      {body && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">{body}</p>}
      {children && <div className="mt-5">{children}</div>}
    </li>
  );
}
