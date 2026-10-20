const pkNumber = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 });

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "";
  return pkNumber.format(num);
}

/** Rs. 125,000 */
export function formatPKR(amount: number | string | null | undefined, prefix = "Rs."): string {
  const f = formatNumber(amount);
  return f ? `${prefix} ${f}` : "";
}

export function formatDate(d: Date | string | null | undefined, locale: "en" | "ur" = "en"): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined, locale: "en" | "ur" = "en"): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(date);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

export function relativeDays(d: Date | string, locale: "en" | "ur" = "en"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const days = daysBetween(new Date(), date);
  if (locale === "ur") {
    if (days === 0) return "آج";
    if (days === 1) return "کل";
    return `${days} دن پہلے`;
  }
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** "500 × 40 kg" for fixed-weight package units, otherwise "500 kg". */
export function formatQuantity(quantity: number | string | null | undefined, unitSymbol: string | null | undefined): string {
  const q = formatNumber(quantity);
  if (!q) return "";
  if (!unitSymbol) return q;
  return /^\d/.test(unitSymbol) ? `${q} × ${unitSymbol}` : `${q} ${unitSymbol}`;
}
