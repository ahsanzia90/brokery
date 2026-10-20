/** "pending_review" → "Pending review"; also maps a few domain values to friendlier words. */
const SPECIAL: Record<string, string> = {
  on_contact: "Price on contact",
  quote: "Request a quote",
  negotiable: "Negotiable",
  fixed: "Fixed price",
};
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  if (SPECIAL[value]) return SPECIAL[value];
  const s = value.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
