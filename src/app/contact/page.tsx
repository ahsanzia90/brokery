import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { getBrand } from "@/lib/config/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { getPageBySlug } from "@/lib/data/content";
import { renderMarkdown } from "@/lib/content/markdown";
import { formatPhoneDisplay, whatsappLink } from "@/lib/utils/phone";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/contact", title: "Contact and Support", description: "Questions, complaints about a listing or supplier, privacy requests or account problems. Every message gets a reference number." });
}

export default async function ContactPage() {
  const { t, locale } = await getT();
  const [brand, user, page] = await Promise.all([getBrand(), getCurrentUser(), getPageBySlug("contact")]);
  const body = page ? (locale === "ur" && page.bodyUr ? page.bodyUr : page.bodyEn) : "";
  const hasContact = Boolean(brand.contactEmail || brand.contactPhone || brand.contactWhatsapp);
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("contact.title") }]} homeLabel={t("common.home")} />
      <PageHeader eyebrow={t("footer.contact")} title={t("contact.title")} subtitle={t("contact.sub")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div>
          <p className="mb-5 max-w-2xl text-[15px] text-ink-2">{t("browse.contactIntro")}</p>
          <ContactForm defaults={{ name: user?.name ?? "", contact: user?.phone ?? "" }} />
        </div>
        <aside className="space-y-4">
          <div className="panel panel-mint !p-6">
            <p className="eyebrow">{t("browse.contactDetails")}</p>
            <h2 className="mt-1 text-[20px] font-bold text-ink">{brand.name}</h2>
            {hasContact ? (
              <ul className="mt-4 space-y-3 text-[15px]">
                {brand.contactEmail && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-brand-700" aria-hidden />
                    <a href={`mailto:${brand.contactEmail}`} className="font-latin font-semibold text-brand-900 hover:underline">
                      {brand.contactEmail}
                    </a>
                  </li>
                )}
                {brand.contactPhone && (
                  <li className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-brand-700" aria-hidden />
                    <a href={`tel:${brand.contactPhone}`} className="font-latin font-semibold text-brand-900 num hover:underline">
                      {formatPhoneDisplay(brand.contactPhone)}
                    </a>
                  </li>
                )}
                {brand.contactWhatsapp && (
                  <li className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-brand-700" aria-hidden />
                    <a href={whatsappLink(brand.contactWhatsapp)} rel="noopener" target="_blank" className="font-semibold text-brand-900 hover:underline">
                      {t("action.whatsapp")}
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-ink-2">{t("contact.sub")}</p>
            )}
          </div>
          {body && <div className="prose-simple rounded-[var(--r-lg)] border border-line p-5 text-[14px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />}
        </aside>
      </div>
    </div>
  );
}
