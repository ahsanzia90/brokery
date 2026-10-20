import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { Logo } from "./logo";

export function Footer({ t, locale, brandName, categories }: { t: Translator; locale: Locale; brandName: string; categories: Array<{ slug: string; nameEn: string; nameUr: string | null }> }) {
  const name = (c: { nameEn: string; nameUr: string | null }) => (locale === "ur" && c.nameUr ? c.nameUr : c.nameEn);
  const col = "flex flex-col gap-2.5 text-[14px]";
  const link = "text-white/70 hover:text-white";
  const head = "mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-lime-400";
  return (
    <footer className="mt-16 bg-brand-950 pb-24 text-white md:pb-10">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo name={brandName} inverted />
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">{t("site.tagline")}</p>
          <p className="mt-4 text-[13px] leading-relaxed text-white/55">{t("footer.noPayments")}</p>
        </div>
        <div>
          <h2 className={head}>{t("footer.categories")}</h2>
          <ul className={col}>
            {categories.slice(0, 8).map((c) => (
              <li key={c.slug}><Link href={`/categories/${c.slug}`} className={link}>{name(c)}</Link></li>
            ))}
            <li><Link href="/categories" className="font-semibold text-lime-400 hover:text-lime-100">{t("home.categories.all")} ›</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={head}>{t("footer.forSuppliers")}</h2>
          <ul className={col}>
            <li><Link href="/sell" className={link}>{t("footer.registerSupplier")}</Link></li>
            <li><Link href="/dashboard/seller/listings/new" className={link}>{t("footer.addListing")}</Link></li>
            <li><Link href="/verification-policy" className={link}>{t("footer.verification")}</Link></li>
            <li><Link href="/listing-policy" className={link}>{t("footer.listingPolicy")}</Link></li>
            <li><Link href="/prohibited-items" className={link}>{t("footer.prohibited")}</Link></li>
          </ul>
          <h2 className={`${head} mt-7`}>{t("footer.forBuyers")}</h2>
          <ul className={col}>
            <li><Link href="/buy" className={link}>{t("action.findSuppliers")}</Link></li>
            <li><Link href="/rfq/new" className={link}>{t("action.createRfq")}</Link></li>
            <li><Link href="/prices" className={link}>{t("nav.prices")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={head}>{t("footer.company")}</h2>
          <ul className={col}>
            <li><Link href="/about" className={link}>{t("footer.about")}</Link></li>
            <li><Link href="/how-it-works" className={link}>{t("footer.howItWorks")}</Link></li>
            <li><Link href="/guides" className={link}>{t("footer.guides")}</Link></li>
            <li><Link href="/markets" className={link}>{t("market.title")}</Link></li>
            <li><Link href="/contact" className={link}>{t("footer.contact")}</Link></li>
            <li><Link href="/privacy-policy" className={link}>{t("footer.privacy")}</Link></li>
            <li><Link href="/terms-of-use" className={link}>{t("footer.terms")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-white/10 pt-5 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
        <span>{t("footer.rights", { year: new Date().getFullYear(), brand: brandName })}</span>
        <span className="max-w-xl">{t("common.disclaimer", { brand: brandName })}</span>
      </div>
    </footer>
  );
}
