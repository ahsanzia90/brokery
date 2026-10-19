import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

export function Footer({ t, locale, brandName, categories }: { t: Translator; locale: Locale; brandName: string; categories: Array<{ slug: string; nameEn: string; nameUr: string | null }> }) {
  const name = (c: { nameEn: string; nameUr: string | null }) => (locale === "ur" && c.nameUr ? c.nameUr : c.nameEn);
  const col = "flex flex-col gap-2 text-[0.95rem]";
  const link = "text-text-muted hover:text-primary hover:underline underline-offset-2";
  return (
    <footer className="mt-12 border-t border-border bg-surface pb-20 md:pb-8">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="mb-3 font-bold">{t("footer.categories")}</h2>
          <ul className={col}>
            {categories.slice(0, 10).map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className={link}>
                  {name(c)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categories" className="font-semibold text-primary">
                {t("home.categories.all")} ›
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-bold">{t("footer.forSuppliers")}</h2>
          <ul className={col}>
            <li><Link href="/sell" className={link}>{t("footer.registerSupplier")}</Link></li>
            <li><Link href="/dashboard/seller/listings/new" className={link}>{t("footer.addListing")}</Link></li>
            <li><Link href="/verification-policy" className={link}>{t("footer.verification")}</Link></li>
            <li><Link href="/listing-policy" className={link}>{t("footer.listingPolicy")}</Link></li>
            <li><Link href="/prohibited-items" className={link}>{t("footer.prohibited")}</Link></li>
          </ul>
          <h2 className="mb-3 mt-6 font-bold">{t("footer.forBuyers")}</h2>
          <ul className={col}>
            <li><Link href="/buy" className={link}>{t("action.findSuppliers")}</Link></li>
            <li><Link href="/rfq/new" className={link}>{t("action.createRfq")}</Link></li>
            <li><Link href="/prices" className={link}>{t("nav.prices")}</Link></li>
            <li><Link href="/guides" className={link}>{t("footer.guides")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-bold">{t("footer.company")}</h2>
          <ul className={col}>
            <li><Link href="/about" className={link}>{t("footer.about")}</Link></li>
            <li><Link href="/how-it-works" className={link}>{t("footer.howItWorks")}</Link></li>
            <li><Link href="/contact" className={link}>{t("footer.contact")}</Link></li>
            <li><Link href="/privacy-policy" className={link}>{t("footer.privacy")}</Link></li>
            <li><Link href="/terms-of-use" className={link}>{t("footer.terms")}</Link></li>
            <li><Link href="/markets" className={link}>{t("market.title")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm text-text-muted">{t("footer.noPayments")}</p>
          <p className="mt-4 text-sm text-text-muted">{t("common.disclaimer", { brand: brandName })}</p>
        </div>
      </div>
      <div className="container-page border-t border-border pt-4 text-sm text-text-muted">{t("footer.rights", { year: new Date().getFullYear(), brand: brandName })}</div>
    </footer>
  );
}
