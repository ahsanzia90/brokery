import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import { RateChip, type PriceRowData } from "@/components/marketplace/cards";

/** Dark "Aaj ke rate" band reused on commodity, variety and city pages. */
export function RatesBand({ rates, t, locale, title, href, empty }: { rates: PriceRowData[]; t: Translator; locale: Locale; title: string; href?: string; empty?: React.ReactNode }) {
  return (
    <section className="rounded-[var(--r-xl)] bg-brand-950 px-5 py-6 text-white md:px-8 md:py-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-lime-400">{t("home.rates.eyebrow")}</p>
          <h2 className="mt-1 text-[20px] font-bold md:text-[24px]">{title}</h2>
          <p className="mt-1 text-[13px] text-white/60">{t("home.rates.note")}</p>
        </div>
        {href && rates.length > 0 && (
          <Link href={href} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-lime-400 hover:text-lime-100">
            {t("browse.allRates")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>
      {rates.length ? (
        <div className="scroll-x">
          {rates.map((p) => (
            <RateChip key={p.id} p={p} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--r-md)] border border-dashed border-white/20 p-4 text-[14px] text-white/70">{empty}</div>
      )}
    </section>
  );
}
