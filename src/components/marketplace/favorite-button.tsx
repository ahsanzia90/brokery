"use client";
import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/lib/favorites/actions";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/components/ui/toast";

export function FavoriteButton({ kind, id, initialSaved, next, size = "md" }: { kind: "listing" | "business" | "commodity"; id: string; initialSaved: boolean; next: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={saved}
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
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] border font-semibold ${size === "sm" ? "min-h-[40px] px-3 text-sm" : "min-h-[48px] px-4"} ${saved ? "border-accent bg-accent-soft text-[#6b4712]" : "border-border-strong bg-surface hover:bg-surface-muted"}`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? t("action.unfavorite") : t("action.favorite")}
    </button>
  );
}
