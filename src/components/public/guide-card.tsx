import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/utils/format";

const TINTS = ["panel-sand", "panel-sky", "panel-rose", "panel-mint", "panel-lavender", "panel-peach"];

export function GuideCard({ g, locale, index = 0, moreLabel }: { g: { slug: string; titleEn: string; titleUr: string | null; excerptEn: string | null; excerptUr: string | null; publishedAt?: Date | null }; locale: Locale; index?: number; moreLabel: string }) {
  const title = locale === "ur" && g.titleUr ? g.titleUr : g.titleEn;
  const excerpt = locale === "ur" && g.excerptUr ? g.excerptUr : g.excerptEn;
  return (
    <article className={`panel ${TINTS[index % TINTS.length]} flex h-full flex-col !p-6`}>
      <h3 className="text-[19px] font-bold leading-snug text-ink">
        <Link href={`/guides/${g.slug}`} className="hover:text-brand-800">
          {title}
        </Link>
      </h3>
      {excerpt && <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{excerpt}</p>}
      <div className="mt-auto flex items-center justify-between pt-4">
        <Link href={`/guides/${g.slug}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-brand-800">
          {moreLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
        {g.publishedAt && <span className="text-[12px] text-muted num">{formatDate(g.publishedAt, locale)}</span>}
      </div>
    </article>
  );
}
