import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/inter";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/600.css";
import "@fontsource/noto-naskh-arabic/400.css";
import "@fontsource/noto-naskh-arabic/600.css";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/translate";
import { dirFor } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/toast";
import { getBrand, getSettings } from "@/lib/config/settings";
import { BRAND_DEFAULTS } from "@/lib/config/brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const settings = await getSettings();
  return {
    metadataBase: new URL(BRAND_DEFAULTS.siteUrl),
    title: { default: `${brand.productName} | ${brand.name}`, template: `%s${String(settings["seo.default_title_suffix"] ?? ` | ${brand.name}`)}` },
    description: String(settings["seo.default_description"]),
    applicationName: brand.name,
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
    openGraph: { siteName: brand.name, type: "website", locale: "en_PK" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f5b3d" };

/** Root layout: document shell and providers only. Site chrome lives in (site)/layout.tsx, admin chrome in admin/(panel)/layout.tsx. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
