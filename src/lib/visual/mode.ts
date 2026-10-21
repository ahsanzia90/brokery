import "server-only";
import { cookies } from "next/headers";
import { getSetting } from "@/lib/config/settings";

import type { VisualMode } from "./mode-types";
export type { VisualMode } from "./mode-types";
export const VISUAL_COOKIE = "ml_visual";

/**
 * Site-wide visual mode: "photos" shows real photographs of commodities wherever one exists
 * (with illustrations as fallback), "illustrations" keeps the duotone artwork. The admin
 * setting decides the default; a preview cookie (/api/visual?mode=photos) overrides it.
 */
export async function getVisualMode(): Promise<VisualMode> {
  const c = await cookies();
  const override = c.get(VISUAL_COOKIE)?.value;
  if (override === "photos" || override === "illustrations") return override;
  const enabled = await getSetting<boolean>("ui.photos_enabled", false);
  return enabled ? "photos" : "illustrations";
}
