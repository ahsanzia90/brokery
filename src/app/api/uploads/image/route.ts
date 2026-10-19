import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { getStorage, newObjectKey } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, processListingImage, sniffIsImage } from "@/lib/storage/images";

export const dynamic = "force-dynamic";

/**
 * POST multipart/form-data { file } [?kind=listing|logo]
 * Re-encodes to WebP (strips EXIF/GPS), stores in the PUBLIC bucket and returns { path, width, height }.
 * The path is only attached to a listing/business by a server action that re-validates its prefix.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    await enforceRateLimit(`upload:image:${user.id}`, 60, 60 * 60);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "rate_limited", retryAfter: e.retryAfterSeconds }, { status: 429 });
    throw e;
  }
  const kind = new URL(req.url).searchParams.get("kind") === "logo" ? "logos" : "listings";
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "too_large", max: MAX_IMAGE_BYTES }, { status: 413 });
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!(await sniffIsImage(buf))) return NextResponse.json({ error: "not_an_image" }, { status: 415 });
  try {
    const processed = await processListingImage(buf);
    const key = newObjectKey(kind, processed.ext);
    await getStorage().put("public", key, processed.data, processed.contentType);
    return NextResponse.json({ path: key, width: processed.width, height: processed.height, url: getStorage().publicUrl(key) });
  } catch {
    return NextResponse.json({ error: "processing_failed" }, { status: 422 });
  }
}
