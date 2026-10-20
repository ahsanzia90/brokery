import "server-only";
import sharp from "sharp";

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES ?? 5 * 1024 * 1024);
export const MAX_DOCUMENT_BYTES = Number(process.env.MAX_DOCUMENT_BYTES ?? 10 * 1024 * 1024);

/**
 * Re-encode uploaded images: strips metadata (EXIF/GPS), limits dimensions,
 * and guarantees the output is a real image rather than a disguised file.
 */
export async function processListingImage(input: Buffer): Promise<{ data: Buffer; width: number; height: number; contentType: string; ext: string }> {
  const img = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("Invalid image");
  const out = await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height, contentType: "image/webp", ext: "webp" };
}

export async function sniffIsImage(input: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(input).metadata();
    return Boolean(meta.format && ["jpeg", "png", "webp"].includes(meta.format));
  } catch {
    return false;
  }
}

export function isPdf(input: Buffer): boolean {
  return input.subarray(0, 5).toString("latin1") === "%PDF-";
}
