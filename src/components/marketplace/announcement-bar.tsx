import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { renderMarkdown } from "@/lib/content/markdown";

/** Shows the latest published announcement (content kind = announcement). Renders nothing when there is none. */
export async function AnnouncementBar({ locale }: { locale: Locale }) {
  const [a] = await db
    .select({ titleEn: contentPages.titleEn, titleUr: contentPages.titleUr, bodyEn: contentPages.bodyEn, bodyUr: contentPages.bodyUr })
    .from(contentPages)
    .where(and(eq(contentPages.kind, "announcement"), eq(contentPages.status, "published")))
    .orderBy(desc(contentPages.publishedAt))
    .limit(1);
  if (!a) return null;
  const title = locale === "ur" && a.titleUr ? a.titleUr : a.titleEn;
  const body = locale === "ur" && a.bodyUr ? a.bodyUr : a.bodyEn;
  return (
    <div role="status" className="border-b border-accent/40 bg-accent-soft">
      <div className="container-page py-2 text-[0.95rem]">
        <strong>{title}</strong>
        {body && <span className="prose-simple ms-2 inline [&_p]:inline [&_p]:m-0" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />}
      </div>
    </div>
  );
}
