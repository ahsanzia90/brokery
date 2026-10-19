import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { redirects, seoMetadata } from "@/db/schema";
import { audit } from "@/lib/audit";
import { revalidatePublic } from "./cache";

export class SeoError extends Error {}
type SeoInsert = typeof seoMetadata.$inferInsert;
export type SeoInput = Omit<SeoInsert, "id" | "createdAt" | "updatedAt" | "updatedBy">;

function normalizePath(p: string): string {
  const t = p.trim();
  if (!t.startsWith("/") || t.startsWith("//") || /\s/.test(t)) throw new SeoError("Path must start with / and contain no spaces");
  return t.length > 1 ? t.replace(/\/+$/, "") : t;
}

export async function saveSeo(actorId: string, input: SeoInput, id?: string) {
  const data: SeoInput = { ...input };
  if (data.path) data.path = normalizePath(data.path);
  if (!data.path && !(data.entityType && data.entityId)) throw new SeoError("Provide a path or an entity");
  if (data.path && data.entityType) {
    // keep one key per row to avoid ambiguity
    data.entityType = null;
    data.entityId = null;
  }
  if (data.robots && !/^(index|noindex),(follow|nofollow)$/.test(data.robots)) throw new SeoError("Invalid robots value");
  if (data.canonicalUrl && !/^(https?:\/\/|\/)/.test(data.canonicalUrl)) throw new SeoError("Canonical must be an absolute URL or a path");
  const existing = data.path
    ? await db.select().from(seoMetadata).where(eq(seoMetadata.path, data.path))
    : await db.select().from(seoMetadata).where(and(eq(seoMetadata.entityType, data.entityType!), eq(seoMetadata.entityId, data.entityId!)));
  if (existing[0] && existing[0].id !== id) throw new SeoError("An override for this page already exists — edit it instead");
  if (id) {
    const [before] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, id));
    const [row] = await db.update(seoMetadata).set({ ...data, updatedBy: actorId }).where(eq(seoMetadata.id, id)).returning();
    await audit({ actorId, action: "seo.update", entityType: "seo_metadata", entityId: id, before: { title: before?.title, robots: before?.robots, canonicalUrl: before?.canonicalUrl }, after: { title: row.title, robots: row.robots, canonicalUrl: row.canonicalUrl } });
    if (row.path) revalidatePublic(row.path);
    return row;
  }
  const [row] = await db.insert(seoMetadata).values({ ...data, updatedBy: actorId }).returning();
  await audit({ actorId, action: "seo.create", entityType: "seo_metadata", entityId: row.id, after: { path: row.path, entityType: row.entityType, entityId: row.entityId, title: row.title } });
  if (row.path) revalidatePublic(row.path);
  return row;
}

export async function deleteSeo(actorId: string, id: string) {
  const [before] = await db.select().from(seoMetadata).where(eq(seoMetadata.id, id));
  if (!before) return;
  await db.delete(seoMetadata).where(eq(seoMetadata.id, id));
  await audit({ actorId, action: "seo.delete", entityType: "seo_metadata", entityId: id, before: { path: before.path, entityType: before.entityType, entityId: before.entityId } });
  if (before.path) revalidatePublic(before.path);
}

export async function saveRedirect(actorId: string, input: { sourcePath: string; destinationPath: string; statusCode: number; isActive: boolean }, id?: string) {
  const source = normalizePath(input.sourcePath);
  const destination = input.statusCode === 410 ? normalizePath(input.destinationPath || "/") : /^https?:\/\//.test(input.destinationPath.trim()) ? input.destinationPath.trim() : normalizePath(input.destinationPath);
  if (![301, 302, 410].includes(input.statusCode)) throw new SeoError("Status must be 301, 302 or 410");
  if (source === destination) throw new SeoError("Source and destination are the same");
  // Loop check: follow destination chain through existing redirects.
  const all = await db.select().from(redirects).where(eq(redirects.isActive, true));
  const map = new Map(all.filter((r) => r.id !== id).map((r) => [r.sourcePath, r.destinationPath]));
  map.set(source, destination);
  let cur: string | undefined = destination;
  for (let i = 0; i < 20 && cur; i++) {
    if (cur === source) throw new SeoError("This redirect would create a loop");
    cur = map.get(cur);
  }
  const [dup] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.sourcePath, source));
  if (dup && dup.id !== id) throw new SeoError("A redirect from this source already exists");
  if (id) {
    const [before] = await db.select().from(redirects).where(eq(redirects.id, id));
    const [row] = await db.update(redirects).set({ sourcePath: source, destinationPath: destination, statusCode: input.statusCode, isActive: input.isActive }).where(eq(redirects.id, id)).returning();
    await audit({ actorId, action: "seo.redirect.update", entityType: "redirect", entityId: id, before: { sourcePath: before?.sourcePath, destinationPath: before?.destinationPath, isActive: before?.isActive }, after: { sourcePath: row.sourcePath, destinationPath: row.destinationPath, isActive: row.isActive } });
    return row;
  }
  const [row] = await db.insert(redirects).values({ sourcePath: source, destinationPath: destination, statusCode: input.statusCode, isActive: input.isActive, createdBy: actorId }).returning();
  await audit({ actorId, action: "seo.redirect.create", entityType: "redirect", entityId: row.id, after: { sourcePath: row.sourcePath, destinationPath: row.destinationPath, statusCode: row.statusCode } });
  return row;
}

export async function deleteRedirect(actorId: string, id: string) {
  const [before] = await db.select().from(redirects).where(eq(redirects.id, id));
  if (!before) return;
  await db.delete(redirects).where(eq(redirects.id, id));
  await audit({ actorId, action: "seo.redirect.delete", entityType: "redirect", entityId: id, before: { sourcePath: before.sourcePath, destinationPath: before.destinationPath } });
}
