/**
 * Pakistani phone normalization to E.164.
 * Accepts: 03001234567, 3001234567, +923001234567, 923001234567, 0092 300 1234567
 */
export function normalizePakistanPhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Pakistani mobile numbers: 3XXXXXXXXX (10 digits). Landlines vary; accept 9–10 digits.
  if (!/^\d{9,10}$/.test(digits)) return null;
  if (digits.length === 10 && !digits.startsWith("3")) return null;
  return "+92" + digits;
}

export function isValidPakistanPhone(raw: string): boolean {
  return normalizePakistanPhone(raw) !== null;
}

/** +92 300 1234567 */
export function formatPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+92(\d{3})(\d{7})$/);
  if (m) return `+92 ${m[1]} ${m[2]}`;
  return e164;
}

/** 0300 1234567 (local style) */
export function formatPhoneLocal(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+92(\d{3})(\d{7})$/);
  if (m) return `0${m[1]} ${m[2]}`;
  return e164;
}

export function whatsappLink(e164: string, text?: string): string {
  const num = e164.replace(/[^\d]/g, "");
  const base = `https://wa.me/${num}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function maskPhone(e164: string): string {
  return e164.replace(/^(\+92\d{3})\d{4}(\d{3})$/, "$1••••$2");
}
