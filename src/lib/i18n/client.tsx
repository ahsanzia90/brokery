"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createTranslator, type Messages, type Translator } from "./translate";

type Ctx = { locale: Locale; t: Translator; dir: "ltr" | "rtl" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const t: Translator = (key, vars) => {
      let s = messages[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    };
    return { locale, t, dir: locale === "ur" ? "rtl" : "ltr" };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Allow usage outside provider (e.g. tests) with English fallback
    return { locale: "en", t: createTranslator("en"), dir: "ltr" };
  }
  return ctx;
}

export function useT(): Translator {
  return useI18n().t;
}
