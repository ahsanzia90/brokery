import en from "./messages/en.json";
import ur from "./messages/ur.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

export type Messages = Record<string, string>;
const dictionaries: Record<Locale, Messages> = { en: en as Messages, ur: ur as Messages };

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function createTranslator(locale: Locale, extra?: Messages): Translator {
  const primary = { ...getMessages(locale), ...(extra ?? {}) };
  const fallback = getMessages(DEFAULT_LOCALE);
  return (key, vars) => {
    let s = primary[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  };
}

/** Pick a localized field from a row with nameEn/nameUr style columns. */
export function localized<T extends Record<string, unknown>>(row: T, base: string, locale: Locale): string {
  const ur = row[`${base}Ur`];
  const en = row[`${base}En`];
  if (locale === "ur" && typeof ur === "string" && ur.trim()) return ur;
  if (typeof en === "string") return en;
  return "";
}
