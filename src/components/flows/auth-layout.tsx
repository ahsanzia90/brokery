import Link from "next/link";
import type { ReactNode } from "react";
import type { Translator } from "@/lib/i18n/translate";

/** Two-panel auth composition: form on the left, numbered benefits panel on the right. */
export function AuthLayout({ t, title, subtitle, children, footer }: { t: Translator; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page py-8 md:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.9fr] lg:gap-10">
        <section className="rounded-[var(--r-xl)] border border-line bg-surface p-6 md:p-10">
          <h1 className="text-[26px] font-extrabold leading-tight text-ink md:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 border-t border-line pt-5 text-[13px] text-muted">{footer}</div>}
        </section>
        <aside className="panel panel-mint hidden flex-col justify-between lg:flex">
          <ol className="space-y-7">
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <span className="step-no">0{n}.</span>
                <h2 className="mt-1 text-[20px] font-bold leading-snug text-ink">{t(`auth.benefit.${n}.title`)}</h2>
                <p className="mt-1.5 max-w-sm text-[15px] text-ink-2">{t(`auth.benefit.${n}.body`)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-[13px] text-ink-2">
            <Link href="/how-it-works" className="font-semibold text-brand-800 underline underline-offset-4">
              {t("footer.howItWorks")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
