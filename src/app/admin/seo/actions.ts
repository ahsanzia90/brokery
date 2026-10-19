"use server";
import { requirePermission } from "@/lib/authz/guards";
import { back, fd, fdBool, fdInt, fdNullable, runAdmin } from "@/lib/admin/action-utils";
import * as svc from "@/lib/admin/seo-service";
import { getStorage, newObjectKey } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, processListingImage } from "@/lib/storage/images";

export async function saveSeoAction(formData: FormData) {
  const user = await requirePermission("seo.manage");
  const id = fdNullable(formData, "id");
  const p = id ? `/admin/seo/${id}` : "/admin/seo";
  const row = await runAdmin(async () => {
    let ogImagePath: string | null | undefined;
    const file = formData.get("ogImage");
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("OG image must be JPG, PNG or WebP");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("OG image is too large");
      const processed = await processListingImage(Buffer.from(await file.arrayBuffer()));
      ogImagePath = newObjectKey("og", processed.ext);
      await getStorage().put("public", ogImagePath, processed.data, processed.contentType);
    }
    if (fdBool(formData, "removeOgImage")) ogImagePath = null;
    const includeRaw = fd(formData, "includeInSitemap");
    return svc.saveSeo(
      user.id,
      {
        path: fdNullable(formData, "path"),
        entityType: fdNullable(formData, "entityType"),
        entityId: fdNullable(formData, "entityId"),
        title: fdNullable(formData, "title"),
        description: fdNullable(formData, "description"),
        canonicalUrl: fdNullable(formData, "canonicalUrl"),
        robots: fdNullable(formData, "robots"),
        ogTitle: fdNullable(formData, "ogTitle"),
        ogDescription: fdNullable(formData, "ogDescription"),
        includeInSitemap: includeRaw === "" ? null : includeRaw === "true",
        ...(ogImagePath !== undefined ? { ogImagePath } : {}),
      },
      id ?? undefined,
    );
  }, p);
  back(`/admin/seo/${row.id}`, { ok: "SEO override saved." });
}

export async function deleteSeoAction(formData: FormData) {
  const user = await requirePermission("seo.manage");
  await runAdmin(() => svc.deleteSeo(user.id, fd(formData, "id")), "/admin/seo");
  back("/admin/seo", { ok: "Override removed; the page now uses its default metadata." });
}

export async function saveRedirectAction(formData: FormData) {
  const user = await requirePermission("seo.manage");
  const id = fdNullable(formData, "id");
  await runAdmin(
    () => svc.saveRedirect(user.id, { sourcePath: fd(formData, "sourcePath"), destinationPath: fd(formData, "destinationPath"), statusCode: fdInt(formData, "statusCode", 301), isActive: fdBool(formData, "isActive") }, id ?? undefined),
    "/admin/seo/redirects",
  );
  back("/admin/seo/redirects", { ok: "Redirect saved." });
}

export async function deleteRedirectAction(formData: FormData) {
  const user = await requirePermission("seo.manage");
  await runAdmin(() => svc.deleteRedirect(user.id, fd(formData, "id")), "/admin/seo/redirects");
  back("/admin/seo/redirects", { ok: "Redirect deleted." });
}
