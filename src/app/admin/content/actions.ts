"use server";
import { requirePermission } from "@/lib/authz/guards";
import { back, fd, fdAll, fdBool, fdInt, fdNullable, runAdmin } from "@/lib/admin/action-utils";
import * as svc from "@/lib/admin/content-service";
import { getStorage, newObjectKey } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, processListingImage } from "@/lib/storage/images";

const KINDS = ["page", "article", "guide", "announcement", "faq"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

export async function saveContentAction(formData: FormData) {
  const user = await requirePermission("content.manage");
  const id = fdNullable(formData, "id");
  const p = id ? `/admin/content/${id}/edit` : "/admin/content/new";
  const row = await runAdmin(async () => {
    let coverImagePath: string | null | undefined;
    const file = formData.get("coverImage");
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Cover image must be JPG, PNG or WebP");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("Cover image is too large");
      const processed = await processListingImage(Buffer.from(await file.arrayBuffer()));
      coverImagePath = newObjectKey("content", processed.ext);
      await getStorage().put("public", coverImagePath, processed.data, processed.contentType);
    }
    if (fdBool(formData, "removeCover")) coverImagePath = null;
    const kind = (KINDS as readonly string[]).includes(fd(formData, "kind")) ? (fd(formData, "kind") as (typeof KINDS)[number]) : "page";
    const status = (STATUSES as readonly string[]).includes(fd(formData, "status")) ? (fd(formData, "status") as (typeof STATUSES)[number]) : "draft";
    const scheduledRaw = fdNullable(formData, "scheduledFor");
    const publishedRaw = fdNullable(formData, "publishedAt");
    if (!fd(formData, "titleEn")) throw new Error("English title is required");
    return svc.saveContent(
      user.id,
      {
        kind,
        slug: fd(formData, "slug"),
        titleEn: fd(formData, "titleEn"),
        titleUr: fdNullable(formData, "titleUr"),
        excerptEn: fdNullable(formData, "excerptEn"),
        excerptUr: fdNullable(formData, "excerptUr"),
        bodyEn: fd(formData, "bodyEn"),
        bodyUr: fdNullable(formData, "bodyUr"),
        relatedCommodityIds: fdAll(formData, "relatedCommodityIds"),
        status,
        publishedAt: publishedRaw ? new Date(publishedRaw) : undefined,
        scheduledFor: scheduledRaw && status === "draft" ? new Date(scheduledRaw) : null,
        ...(coverImagePath !== undefined ? { coverImagePath } : {}),
      },
      id ?? undefined,
    );
  }, p);
  back(`/admin/content/${row.id}/edit`, { ok: id ? "Saved." : "Created." });
}

export async function archiveContentAction(formData: FormData) {
  const user = await requirePermission("content.manage");
  const id = fd(formData, "id");
  await runAdmin(() => svc.deleteContent(user.id, id, fd(formData, "reason") || "archived by admin"), `/admin/content/${id}/edit`);
  back("/admin/content", { ok: "Archived." });
}

export async function saveHomepageSectionsAction(formData: FormData) {
  const user = await requirePermission("content.manage");
  const keys = fdAll(formData, "key");
  await runAdmin(async () => {
    for (const key of keys) {
      let config: Record<string, unknown> | null = null;
      const raw = fd(formData, `config_${key}`);
      if (raw) {
        try {
          config = JSON.parse(raw);
        } catch {
          throw new Error(`Section “${key}”: config is not valid JSON`);
        }
      }
      await svc.saveHomepageSection(user.id, key, {
        titleEn: fdNullable(formData, `titleEn_${key}`),
        titleUr: fdNullable(formData, `titleUr_${key}`),
        isEnabled: fdBool(formData, `enabled_${key}`),
        sortOrder: fdInt(formData, `sort_${key}`, 0),
        config,
      });
    }
  }, "/admin/content/homepage");
  back("/admin/content/homepage", { ok: "Homepage sections saved." });
}

export async function saveFooterLinksAction(formData: FormData) {
  const user = await requirePermission("content.manage");
  const labelsEn = formData.getAll("footer_labelEn").map((v) => (typeof v === "string" ? v : ""));
  const labelsUr = formData.getAll("footer_labelUr").map((v) => (typeof v === "string" ? v : ""));
  const hrefs = formData.getAll("footer_href").map((v) => (typeof v === "string" ? v : ""));
  const links = labelsEn.map((labelEn, i) => ({ labelEn, labelUr: labelsUr[i] ?? "", href: hrefs[i] ?? "" }));
  await runAdmin(() => svc.saveFooterLinks(user.id, links), "/admin/content/homepage");
  back("/admin/content/homepage", { ok: "Footer links saved." });
}
