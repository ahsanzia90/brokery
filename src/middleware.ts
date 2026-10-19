import { NextResponse, type NextRequest } from "next/server";

const ANON_COOKIE = "ml_anon";

/**
 * Edge middleware: passes the current path to layouts, sets an anonymous
 * analytics id, and marks private areas noindex. Redirect rules from the
 * database are applied in the not-found handler (see app/not-found.tsx) to keep
 * the edge free of database access.
 */
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-current-path", req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (!req.cookies.get(ANON_COOKIE)) {
    const id = crypto.randomUUID();
    res.cookies.set(ANON_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 180, sameSite: "lax", httpOnly: true });
  }
  const p = req.nextUrl.pathname;
  if (/^\/(admin|dashboard|account|favorites|notifications|login|rfq\/[^/]+|files\/private)/.test(p) && !/^\/rfq\/new/.test(p)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|ico|css|js|map)$).*)"],
};
