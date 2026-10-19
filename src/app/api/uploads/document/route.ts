import { NextResponse } from "next/server";
import { db } from "@/db";
import { businessDocuments, documentTypeEnum } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { getStorage, newObjectKey } from "@/lib/storage";
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, isPdf, sniffIsImage } from "@/lib/storage/images";
import { getBusinessForUser } from "@/lib/business/queries";

export const dynamic = "force-dynamic";

/**
 * POST multipart/form-data { file, documentType? } [?kind=business|listing]
 *  - kind=business (default): stored privately under documents/<businessId>/… and recorded in business_documents → returns { id }
 *  - kind=listing: stored privately under listing-docs/<businessId>/… and returned as { path, mimeType, sizeBytes } for the listing action to attach.
 * Private files are only readable through /files/private with authorization.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "no_business" }, { status: 403 });
  try {
    await enforceRateLimit(`upload:doc:${user.id}`, 30, 60 * 60);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "rate_limited", retryAfter: e.retryAfterSeconds }, { status: 429 });
    throw e;
  }
  const kind = new URL(req.url).searchParams.get("kind") === "listing" ? "listing" : "business";
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: "too_large", max: MAX_DOCUMENT_BYTES }, { status: 413 });
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  const buf = Buffer.from(await file.arrayBuffer());
  const pdf = isPdf(buf);
  if (!pdf && !(await sniffIsImage(buf))) return NextResponse.json({ error: "unsupported_content" }, { status: 415 });
  const contentType = pdf ? "application/pdf" : file.type;
  const ext = pdf ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const originalFilename = file.name.replace(/[^\w. -]/g, "_").slice(0, 120) || `document.${ext}`;

  if (kind === "listing") {
    const key = newObjectKey(`listing-docs/${business.id}`, ext);
    await getStorage().put("private", key, buf, contentType);
    return NextResponse.json({ path: key, mimeType: contentType, sizeBytes: buf.length, originalFilename });
  }

  const docType = String(form.get("documentType") ?? "other");
  const documentType = (documentTypeEnum.enumValues as readonly string[]).includes(docType) ? (docType as (typeof documentTypeEnum.enumValues)[number]) : "other";
  const key = newObjectKey(`documents/${business.id}`, ext);
  await getStorage().put("private", key, buf, contentType);
  const [row] = await db
    .insert(businessDocuments)
    .values({ businessId: business.id, documentType, storagePath: key, originalFilename, mimeType: contentType, sizeBytes: buf.length, uploadedBy: user.id })
    .returning({ id: businessDocuments.id });
  return NextResponse.json({ id: row.id, documentType, originalFilename, sizeBytes: buf.length });
}
