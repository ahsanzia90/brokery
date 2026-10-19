import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";

export function LanguageSwitcher({ locale, next, compact }: { locale: Locale; next: string; compact?: boolean }) {
  return (
    <form action={setLocaleAction} className="flex items-center gap-1" aria-label="Language">
      <input type="hidden" name="next" value={next} />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          aria-pressed={l === locale}
          lang={l}
          className={`min-h-[40px] rounded-full px-3 text-sm font-semibold ${l === locale ? "bg-primary text-white" : "bg-surface-muted text-text hover:bg-border"} ${l === "ur" ? "font-urdu" : "font-latin"}`}
          style={l === "ur" ? { fontFamily: "var(--font-urdu)" } : undefined}
        >
          {compact ? LOCALE_LABELS[l].native : LOCALE_LABELS[l].native}
        </button>
      ))}
    </form>
  );
}
