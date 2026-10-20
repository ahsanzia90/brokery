"use client";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useCurrentPath } from "@/components/ui/active-link";

/** Segmented EN | اردو control; returns to the page the user is on. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const path = useCurrentPath();
  return (
    <form action={setLocaleAction} className="inline-flex rounded-full border border-line bg-surface p-0.5" aria-label="Language">
      <input type="hidden" name="next" value={path} />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          aria-pressed={l === locale}
          lang={l}
          className={`h-9 rounded-full px-3.5 text-[13px] font-semibold leading-none transition-colors ${l === locale ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}
          style={l === "ur" ? { fontFamily: "var(--font-urdu-body)" } : { fontFamily: "var(--font-sans)" }}
        >
          {l === "en" ? "EN" : LOCALE_LABELS[l].native}
        </button>
      ))}
    </form>
  );
}
