import { and, count, eq, isNull } from "drizzle-orm";
import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AnnouncementBar } from "@/components/marketplace/announcement-bar";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrand } from "@/lib/config/settings";
import { getCategoryTree } from "@/lib/data/taxonomy";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

/** Public site + signed-in buyer/seller areas: header, announcement, footer, mobile bar. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const [user, brand, tree] = await Promise.all([getCurrentUser(), getBrand(), getCategoryTree()]);
  let unread = 0;
  if (user) {
    const [row] = await db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
    unread = row?.n ?? 0;
  }
  return (
    <>
      <Header t={t} locale={locale} user={user} brandName={brand.name} unreadCount={unread} logoPath={brand.logoPath} />
      <AnnouncementBar locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer t={t} locale={locale} brandName={brand.name} categories={tree.map((c) => ({ slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr }))} />
      <BottomNav isSeller={Boolean(user?.isSeller)} />
      <JsonLd data={[organizationJsonLd({ name: brand.name, logoPath: brand.logoPath }), websiteJsonLd(brand.name)]} />
    </>
  );
}
