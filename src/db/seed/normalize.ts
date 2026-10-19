/** Normalize text for search aliases: lowercase, strip diacritics, keep letters/digits/spaces. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining diacritics (Latin)
    .replace(/[ً-ْٰ]/g, "") // Arabic/Urdu harakat
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL-safe slug (ASCII only). Non-Latin input falls back to a hash-like suffix. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base) return base;
  let h = 0;
  for (const ch of input) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return `item-${h.toString(36)}`;
}
