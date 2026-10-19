import "server-only";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, homepageSections, siteSettings } from "@/db/schema";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils/text";
import { revalidatePublic, revalidateSettings } from "./cache";

export class ContentError extends Error {}
type ContentInsert = typeof contentPages.$inferInsert;
export type ContentInput = Omit<ContentInsert, "id" | "createdAt" | "updatedAt" | "authorId" | "isSystem">;

const RESERVED_SLUGS = new Set(["admin", "api", "login", "onboarding", "dashboard", "account", "favorites", "notifications", "rfq", "sell", "buy", "search", "categories", "commodities", "listings", "prices", "suppliers", "supplier", "markets", "guides", "files", "contact", "forbidden"]);

export async function saveContent(actorId: string, input: ContentInput, id?: string) {
  const slug = slugify(input.slug || input.titleEn);
  if (input.kind === "page" && RESERVED_SLUGS.has(slug)) throw new ContentError(`"${slug}" is a reserved path`);
  const [dup] = await db.select({ id: contentPages.id }).from(contentPages).where(eq(contentPages.slug, slug));
  if (dup && dup.id !== id) throw new ContentError("Slug already in use");
  const publishedAt = input.status === "published" ? (input.publishedAt ?? new Date()) : input.publishedAt ?? null;
  if (id) {
    const [before] = await db.select().from(contentPages).where(eq(contentPages.id, id));
    if (!before) throw new ContentError("Not found");
    if (before.isSystem && input.status !== "published") throw new ContentError("System pages must stay published");
    const [row] = await db.update(contentPages).set({ ...input, slug, publishedAt }).where(eq(contentPages.id, id)).returning();
    await audit({ actorId, action: "content.update", entityType: "content_page", entityId: id, before: { slug: before.slug, status: before.status, titleEn: before.titleEn }, after: { slug: row.slug, status: row.status, titleEn: row.titleEn } });
    revalidatePublic(`/${row.slug}`);
    revalidatePublic(`/guides/${row.slug}`);
    revalidatePublic("/");
    return row;
  }
  const [row] = await db.insert(contentPages).values({ ...input, slug, publishedAt, authorId: actorId }).returning();
  await audit({ actorId, action: "content.create", entityType: "content_page", entityId: row.id, after: { slug: row.slug, kind: row.kind, status: row.status } });
  revalidatePublic("/");
  return row;
}

export async function deleteContent(actorId: string, id: string, reason: string) {
  const [before] = await db.select().from(contentPages).where(eq(contentPages.id, id));
  if (!before) return;
  if (before.isSystem) throw new ContentError("System pages cannot be deleted");
  await db.update(contentPages).set({ status: "archived" }).where(eq(contentPages.id, id));
  await audit({ actorId, action: "content.archive", entityType: "content_page", entityId: id, before: { status: before.status }, after: { status: "archived" }, reason });
  revalidatePublic("/");
}

/** Called by a scheduler: publishes drafts whose scheduledFor time has passed. */
export async function publishScheduledContent(): Promise<number> {
  const rows = await db
    .update(contentPages)
    .set({ status: "published", publishedAt: new Date(), scheduledFor: null })
    .where(and(eq(contentPages.status, "draft"), isNotNull(contentPages.scheduledFor), lte(contentPages.scheduledFor, new Date())))
    .returning({ id: contentPages.id, slug: contentPages.slug });
  for (const r of rows) await audit({ actorId: null, action: "content.publish_scheduled", entityType: "content_page", entityId: r.id, after: { status: "published" } });
  if (rows.length) revalidatePublic("/");
  return rows.length;
}

export async function saveHomepageSection(actorId: string, key: string, input: { titleEn?: string | null; titleUr?: string | null; isEnabled: boolean; sortOrder: number; config?: Record<string, unknown> | null }) {
  const [before] = await db.select().from(homepageSections).where(eq(homepageSections.key, key));
  if (!before) throw new ContentError("Section not found");
  const [row] = await db.update(homepageSections).set(input).where(eq(homepageSections.key, key)).returning();
  await audit({ actorId, action: "content.homepage_section.update", entityType: "homepage_section", entityId: before.id, before: { isEnabled: before.isEnabled, sortOrder: before.sortOrder, titleEn: before.titleEn }, after: { isEnabled: row.isEnabled, sortOrder: row.sortOrder, titleEn: row.titleEn } });
  revalidatePublic("/");
  return row;
}

export type FooterLink = { labelEn: string; labelUr: string; href: string };
export async function saveFooterLinks(actorId: string, links: FooterLink[]) {
  const clean = links.filter((l) => l.labelEn.trim() && l.href.trim()).map((l) => ({ labelEn: l.labelEn.trim(), labelUr: l.labelUr.trim(), href: l.href.trim() }));
  for (const l of clean) if (!/^(\/|https?:\/\/)/.test(l.href)) throw new ContentError(`Invalid link: ${l.href}`);
  const [before] = await db.select().from(siteSettings).where(eq(siteSettings.key, "footer.links"));
  await db
    .insert(siteSettings)
    .values({ key: "footer.links", value: clean, description: "Extra footer links", updatedBy: actorId })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: clean, updatedBy: actorId, updatedAt: new Date() } });
  await audit({ actorId, action: "settings.update", entityType: "site_setting", entityId: "footer.links", before: { count: Array.isArray(before?.value) ? (before!.value as unknown[]).length : 0 }, after: { count: clean.length } });
  revalidateSettings();
}
