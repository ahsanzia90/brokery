import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  if (isLocale(v)) return v;
  // Fall back to Accept-Language for first visit
  const h = await headers();
  const al = h.get("accept-language") ?? "";
  if (/\bur\b/i.test(al)) return "ur";
  return DEFAULT_LOCALE;
}

export async function getT(): Promise<{ t: Translator; locale: Locale }> {
  const locale = await getLocale();
  return { t: createTranslator(locale), locale };
}
