import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function Section({ title, subtitle, action, children, id, eyebrow, className = "" }: { title: ReactNode; subtitle?: ReactNode; action?: { href: string; label: string }; children: ReactNode; id?: string; eyebrow?: string; className?: string }) {
  return (
    <section id={id} className={`py-10 md:py-14 ${className}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="text-[22px] font-bold leading-tight text-ink md:text-[28px]">{title}</h2>
          {subtitle && <p className="mt-1.5 text-[15px] text-muted md:text-base">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-800 hover:text-brand-900">
            {action.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children, eyebrow }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-8 border-b border-line pb-6">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-[28px] font-extrabold leading-tight text-ink md:text-[36px]">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted md:text-base">{subtitle}</p>}
      {children}
    </header>
  );
}
