"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Seo = {
  id?: string;
  path: string | null;
  entityType: string | null;
  entityId: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImagePath: string | null;
  includeInSitemap: boolean | null;
};

const inp = "mt-1 w-full rounded-[var(--radius)] border border-line-strong bg-surface px-3 py-2 min-h-[44px]";

export function SeoForm({ seo, action, siteUrl, defaultTitle, defaultDescription, entityLabel }: { seo?: Seo; action: (fd: FormData) => Promise<void>; siteUrl: string; defaultTitle?: string; defaultDescription?: string; entityLabel?: string }) {
  const [mode, setMode] = useState<"path" | "entity">(seo?.entityType ? "entity" : "path");
  const [path, setPath] = useState(seo?.path ?? "");
  const [title, setTitle] = useState(seo?.title ?? "");
  const [desc, setDesc] = useState(seo?.description ?? "");
  const previewTitle = title || defaultTitle || "(default page title)";
  const previewDesc = desc || defaultDescription || "(default meta description)";
  return (
    <form action={action} encType="multipart/form-data" className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-4 p-4">
        {seo?.id && <input type="hidden" name="id" value={seo.id} />}
        {!seo?.id && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" name="_mode" checked={mode === "path"} onChange={() => setMode("path")} /> By URL path</label>
            <label className="flex items-center gap-1"><input type="radio" name="_mode" checked={mode === "entity"} onChange={() => setMode("entity")} /> By entity (category, commodity, supplier, content, location)</label>
          </div>
        )}
        {mode === "path" ? (
          <label className="block">
            <span className="text-sm font-semibold">Path</span>
            <input name="path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/commodities/rice" required className={`${inp} font-latin`} readOnly={Boolean(seo?.id)} />
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Entity type</span>
              <select name="entityType" defaultValue={seo?.entityType ?? "commodity"} className={inp} disabled={Boolean(seo?.id)}>
                {["category", "commodity", "variety", "business", "content", "location"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {seo?.id && <input type="hidden" name="entityType" value={seo.entityType ?? ""} />}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Entity ID {entityLabel ? `(${entityLabel})` : ""}</span>
              <input name="entityId" defaultValue={seo?.entityId ?? ""} placeholder="UUID — copy from the entity's admin page URL" className={`${inp} font-latin`} readOnly={Boolean(seo?.id)} />
            </label>
          </div>
        )}
        <label className="block">
          <span className="text-sm font-semibold">Title <span className={`num text-xs ${title.length > 60 ? "text-danger" : "text-muted"}`}>{title.length}/60</span></span>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inp} placeholder={defaultTitle ?? "Leave blank to use the default"} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Meta description <span className={`num text-xs ${desc.length > 160 ? "text-danger" : "text-muted"}`}>{desc.length}/160</span></span>
          <textarea name="description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inp} placeholder={defaultDescription ?? "Leave blank to use the default"} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Canonical URL</span>
            <input name="canonicalUrl" defaultValue={seo?.canonicalUrl ?? ""} placeholder="blank = this page's own URL" className={`${inp} font-latin`} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Robots</span>
            <select name="robots" defaultValue={seo?.robots ?? ""} className={inp}>
              <option value="">default (index,follow)</option>
              <option value="index,follow">index,follow</option>
              <option value="noindex,follow">noindex,follow</option>
              <option value="noindex,nofollow">noindex,nofollow</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Include in sitemap</span>
            <select name="includeInSitemap" defaultValue={seo?.includeInSitemap === null || seo?.includeInSitemap === undefined ? "" : String(seo.includeInSitemap)} className={inp}>
              <option value="">default (by rules)</option>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Open Graph image</span>
            <input type="file" name="ogImage" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" />
            {seo?.ogImagePath && (
              <span className="mt-1 flex items-center gap-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/files/public/${seo.ogImagePath}`} alt="" className="h-10 w-16 rounded object-cover" />
                <label className="flex items-center gap-1"><input type="checkbox" name="removeOgImage" /> remove</label>
              </span>
            )}
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">OG title</span>
          <input name="ogTitle" defaultValue={seo?.ogTitle ?? ""} className={inp} placeholder="blank = title" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">OG description</span>
          <textarea name="ogDescription" defaultValue={seo?.ogDescription ?? ""} rows={2} className={inp} placeholder="blank = meta description" />
        </label>
        <Button type="submit">Save override</Button>
      </div>
      <aside className="card h-fit p-4">
        <p className="mb-2 text-sm font-semibold">Search snippet preview</p>
        <div className="rounded border border-line bg-white p-3 font-latin" dir="ltr">
          <p className="truncate text-xs text-[#202124]">{siteUrl}{mode === "path" ? path || "/…" : "/…"}</p>
          <p className="truncate text-lg text-[#1a0dab]">{previewTitle}</p>
          <p className="line-clamp-2 text-sm text-[#4d5156]">{previewDesc}</p>
        </div>
        <p className="mt-2 text-xs text-muted">Google typically shows ~60 characters of a title and ~160 of a description. The brand suffix from Settings is appended automatically unless the title already contains the brand name.</p>
      </aside>
    </form>
  );
}
