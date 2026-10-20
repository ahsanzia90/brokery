"use server";
import { requirePermission, requireSuperAdmin } from "@/lib/authz/guards";
import { back, fd, fdBool, runAdmin } from "@/lib/admin/action-utils";
import { NOTIFICATION_TEMPLATE_TYPES, PAYMENT_FLAGS, SETTING_GROUPS, parseSettingValue, saveFeatureFlag, saveSettings } from "@/lib/admin/settings-service";
import { getStorage, newObjectKey } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, processListingImage } from "@/lib/storage/images";

export async function saveSettingsAction(formData: FormData) {
  const user = await requirePermission("settings.manage");
  const changed = await runAdmin(async () => {
    const values: Record<string, unknown> = {};
    for (const g of SETTING_GROUPS) {
      for (const def of g.keys) {
        if (def.readOnly) continue;
        const raw = formData.get(def.key);
        if (def.type === "boolean") values[def.key] = raw === "on";
        else if (raw !== null) values[def.key] = parseSettingValue(def, typeof raw === "string" ? raw : null);
      }
    }
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(logo.type)) throw new Error("Logo must be JPG, PNG or WebP");
      if (logo.size > MAX_IMAGE_BYTES) throw new Error("Logo is too large");
      const processed = await processListingImage(Buffer.from(await logo.arrayBuffer()));
      const key = newObjectKey("brand", processed.ext);
      await getStorage().put("public", key, processed.data, processed.contentType);
      values["brand.logo_path"] = key;
    }
    if (fdBool(formData, "removeLogo")) values["brand.logo_path"] = null;
    return saveSettings(user.id, values);
  }, "/admin/settings");
  back("/admin/settings", { ok: changed ? `${changed} setting${changed === 1 ? "" : "s"} updated.` : "No changes." });
}

export async function saveNotificationTemplatesAction(formData: FormData) {
  const user = await requirePermission("settings.manage");
  const changed = await runAdmin(async () => {
    const values: Record<string, unknown> = {};
    for (const t of NOTIFICATION_TEMPLATE_TYPES) {
      values[`notify.${t.type}.title`] = fd(formData, `title_${t.type}`);
      values[`notify.${t.type}.body`] = fd(formData, `body_${t.type}`);
    }
    return saveSettings(user.id, values);
  }, "/admin/settings");
  back("/admin/settings#templates", { ok: changed ? "Notification templates saved." : "No changes." });
}

export async function saveFlagAction(formData: FormData) {
  const key = fd(formData, "key");
  const user = PAYMENT_FLAGS.has(key) ? await requireSuperAdmin() : await requirePermission("flags.manage");
  await runAdmin(async () => {
    let config: Record<string, unknown> | null | undefined;
    const raw = fd(formData, "config");
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch {
        throw new Error(`Flag “${key}”: config is not valid JSON`);
      }
    } else config = null;
    await saveFeatureFlag(user.id, key, { enabled: fdBool(formData, "enabled"), config, description: fd(formData, "description") || undefined });
  }, "/admin/settings/flags");
  back("/admin/settings/flags", { ok: `Flag “${key}” saved.` });
}
