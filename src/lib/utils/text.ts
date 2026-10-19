/** Lowercase, strip diacritics/punctuation, collapse whitespace. Used for aliases & search. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ْ]/g, "") // latin + arabic diacritics
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "item";
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function randomSuffix(len = 6): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** Strip anything that is not a simple paragraph-level string (defense in depth for user text). */
export function cleanUserText(s: string | null | undefined, max = 4000): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]*>/g, "").replace(/\r/g, "").trim();
  return t ? t.slice(0, max) : null;
}
