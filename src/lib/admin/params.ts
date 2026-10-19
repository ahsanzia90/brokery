export type SearchParams = Record<string, string | string[] | undefined>;

export function str(sp: SearchParams, key: string, fallback = ""): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? fallback;
}

export function int(sp: SearchParams, key: string, fallback = 1, min = 1, max = 100000): number {
  const n = parseInt(str(sp, key, String(fallback)), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function qs(base: string, params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
