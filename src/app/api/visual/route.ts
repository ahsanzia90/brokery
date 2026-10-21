import { NextResponse } from "next/server";
import { VISUAL_COOKIE } from "@/lib/visual/mode";

/** Preview switch: /api/visual?mode=photos | illustrations | default (clears the override). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "default";
  const next = url.searchParams.get("next") ?? "/";
  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin), 303);
  if (mode === "photos" || mode === "illustrations") res.cookies.set(VISUAL_COOKIE, mode, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  else res.cookies.delete(VISUAL_COOKIE);
  return res;
}
