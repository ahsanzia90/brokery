import Link from "next/link";
import type { ReactNode } from "react";

export function Section({ title, subtitle, action, children, id }: { title: ReactNode; subtitle?: ReactNode; action?: { href: string; label: string }; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="py-8 md:py-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-text-muted">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="font-semibold text-primary underline-offset-2 hover:underline">
            {action.label} ›
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-text-muted">{subtitle}</p>}
      {children}
    </header>
  );
}
