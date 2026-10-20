"use client";
import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleFavoriteAction } from "@/lib/favorites/actions";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/components/ui/toast";

export function FavoriteButton({ kind, id, initialSaved, next, size = "md", iconOnly }: { kind: "listing" | "business" | "commodity"; id: string; initialSaved: boolean; next: string; size?: "sm" | "md"; iconOnly?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const label = saved ? t("action.unfavorite") : t("action.favorite");
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={iconOnly ? label : undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleFavoriteAction({ kind, id, next });
          if (res?.ok) {
            setSaved(res.data!.saved);
            toast.push(res.data!.saved ? t("action.unfavorite") : t("action.remove"), "success");
          }
        })
      }
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--r-sm)] border font-semibold transition-colors ${size === "sm" ? "h-9 text-[13px]" : "h-11 text-[14px]"} ${iconOnly ? (size === "sm" ? "w-9" : "w-11") : "px-4"} ${saved ? "border-brand-800 bg-brand-50 text-brand-900" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2"}`}
    >
      <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} aria-hidden />
      {!iconOnly && label}
    </button>
  );
}
