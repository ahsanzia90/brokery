import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";

/** Segmented EN | اردو control. */
export function LanguageSwitcher({ locale, next }: { locale: Locale; next: string; compact?: boolean }) {
  return (
    <form action={setLocaleAction} className="inline-flex rounded-full border border-line bg-surface p-0.5" aria-label="Language">
      <input type="hidden" name="next" value={next} />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          aria-pressed={l === locale}
          lang={l}
          className={`h-8 rounded-full px-3 text-[13px] font-semibold leading-none transition-colors ${l === locale ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}
          style={l === "ur" ? { fontFamily: "var(--font-urdu-body)" } : { fontFamily: "var(--font-sans)" }}
        >
          {l === "en" ? "EN" : LOCALE_LABELS[l].native}
        </button>
      ))}
    </form>
  );
}
