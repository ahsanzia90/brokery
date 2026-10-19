import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator, getMessages } from "@/lib/i18n/translate";
import { dirFor } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrand, getSettings } from "@/lib/config/settings";
import { getCategoryTree } from "@/lib/data/taxonomy";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { BRAND_DEFAULTS } from "@/lib/config/brand";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f6b3a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const h = await headers();
  const currentPath = h.get("x-current-path") ?? "/";
  const [user, brand, tree] = await Promise.all([getCurrentUser(), getBrand(), getCategoryTree()]);
  let unread = 0;
  if (user) {
    const [row] = await db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
    unread = row?.n ?? 0;
  }
  const isAdminArea = currentPath.startsWith("/admin");

  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          <ToastProvider>
            {!isAdminArea && <Header t={t} locale={locale} user={user} brandName={brand.name} currentPath={currentPath} unreadCount={unread} logoPath={brand.logoPath} />}
            <main id="main" className="flex-1">
              {children}
            </main>
            {!isAdminArea && <Footer t={t} locale={locale} brandName={brand.name} categories={tree.map((c) => ({ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr }))} />}
            {!isAdminArea && <BottomNav t={t} currentPath={currentPath} isSeller={Boolean(user?.isSeller)} />}
          </ToastProvider>
        </I18nProvider>
        {!isAdminArea && <JsonLd data={[organizationJsonLd({ name: brand.name, logoPath: brand.logoPath }), websiteJsonLd(brand.name)]} />}
      </body>
    </html>
  );
}
