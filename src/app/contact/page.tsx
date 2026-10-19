import type { Metadata } from "next";
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
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: t("contact.title") }]} homeLabel={t("common.home")} />
      <PageHeader title={t("contact.title")} subtitle={t("contact.sub")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="mb-4 text-text-muted">{t("browse.contactIntro")}</p>
          <ContactForm defaults={{ name: user?.name ?? "", contact: user?.phone ?? "" }} />
        </div>
        <aside className="card p-5">
          <h2 className="font-bold">{brand.name}</h2>
          {brand.contactEmail || brand.contactPhone || brand.contactWhatsapp ? (
            <ul className="mt-2 space-y-2 text-[0.95rem]">
              {brand.contactEmail && (
                <li>
                  <a href={`mailto:${brand.contactEmail}`} className="text-primary underline font-latin">
                    {brand.contactEmail}
                  </a>
                </li>
              )}
              {brand.contactPhone && (
                <li>
                  <a href={`tel:${brand.contactPhone}`} className="text-primary underline font-latin num">
                    {formatPhoneDisplay(brand.contactPhone)}
                  </a>
                </li>
              )}
              {brand.contactWhatsapp && (
                <li>
                  <a href={whatsappLink(brand.contactWhatsapp)} rel="noopener" target="_blank" className="text-primary underline">
                    {t("action.whatsapp")}
                  </a>
                </li>
              )}
            </ul>
          ) : null}
          {body && <div className="prose-simple mt-3 text-[0.95rem]" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />}
        </aside>
      </div>
    </div>
  );
}
