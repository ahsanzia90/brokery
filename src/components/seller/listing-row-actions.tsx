"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pause, Pencil, Play, RefreshCw, Tag, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteDraftAction, setListingStatusAction } from "@/lib/listings/actions";
import type { StatusAction } from "@/lib/listings/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

/**
 * Row actions. `compact` renders a "⋯" menu (dashboard rows); otherwise a button row
 * (listing detail page). Same actions and confirmations in both.
 */
export function ListingRowActions({ listingId, id, slug, status, compact }: { listingId?: string; id?: string; slug?: string; status: string; compact?: boolean }) {
  const lid = (listingId ?? id)!;
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const run = (action: StatusAction) =>
    start(async () => {
      const res = await setListingStatusAction(lid, action);
      if (res.ok) {
        toast.push(t("mylist.updated"), "success");
        router.refresh();
      } else toast.push(t("common.error"), "error");
      setOpen(false);
    });
  const remove = async () => {
    const res = status === "draft" ? await deleteDraftAction(lid) : await setListingStatusAction(lid, "remove");
    if (res.ok) router.refresh();
    else toast.push(t("common.error"), "error");
  };

  const items: Array<{ key: string; label: string; Icon: typeof Pencil; onClick?: () => void; href?: string }> = [];
  if (status === "published" && slug) items.push({ key: "preview", label: t("mylist.preview"), Icon: Eye, href: `/listings/${slug}` });
  items.push({ key: "edit", label: t("action.edit"), Icon: Pencil, href: `/dashboard/seller/listings/${lid}/edit` });
  if (status === "published") {
    items.push({ key: "pause", label: t("action.pause"), Icon: Pause, onClick: () => run("pause") });
    items.push({ key: "sold", label: t("action.markSoldOut"), Icon: Tag, onClick: () => run("sold_out") });
    items.push({ key: "refresh", label: t("listing.refresh"), Icon: RefreshCw, onClick: () => run("refresh") });
  }
  if (status === "paused" || status === "expired") items.push({ key: "resume", label: t("action.resume"), Icon: Play, onClick: () => run("resume") });
  if (status === "sold_out") items.push({ key: "available", label: t("action.markAvailable"), Icon: Play, onClick: () => run("available") });

  const removeButton =
    status !== "removed" ? (
      <ConfirmButton
        title={status === "draft" ? t("mylist.deleteDraft") : t("mylist.removeConfirm")}
        body={status === "draft" ? undefined : t("mylist.removeBody")}
        confirmLabel={status === "draft" ? t("action.delete") : t("action.remove")}
        cancelLabel={t("action.cancel")}
        onConfirm={remove}
      >
        <span className="inline-flex items-center gap-1.5">
          <Trash2 className="h-4 w-4" aria-hidden /> {status === "draft" ? t("mylist.deleteDraft") : t("action.remove")}
        </span>
      </ConfirmButton>
    ) : null;

  if (!compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) =>
          it.href ? (
            <Link key={it.key} href={it.href} className={buttonClass(it.key === "edit" ? "primary" : "outline", "sm")}>
              <it.Icon className="h-4 w-4" aria-hidden /> {it.label}
            </Link>
          ) : (
            <Button key={it.key} size="sm" variant="outline" loading={pending} onClick={it.onClick}>
              <it.Icon className="h-4 w-4" aria-hidden /> {it.label}
            </Button>
          ),
        )}
        {removeButton}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={t("nav.menu")} onClick={() => setOpen((o) => !o)} className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-line text-ink-2 hover:bg-surface-2">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-20 mt-1 w-56 overflow-hidden rounded-[var(--r-md)] border border-line bg-surface p-1 shadow-[var(--shadow-lg)]">
          {items.map((it) =>
            it.href ? (
              <Link key={it.key} role="menuitem" href={it.href} className="flex h-10 items-center gap-2.5 rounded-[6px] px-3 text-[14px] font-medium text-ink hover:bg-surface-2">
                <it.Icon className="h-4 w-4 text-muted" aria-hidden /> {it.label}
              </Link>
            ) : (
              <button key={it.key} role="menuitem" type="button" disabled={pending} onClick={it.onClick} className="flex h-10 w-full items-center gap-2.5 rounded-[6px] px-3 text-start text-[14px] font-medium text-ink hover:bg-surface-2 disabled:opacity-50">
                <it.Icon className="h-4 w-4 text-muted" aria-hidden /> {it.label}
              </button>
            ),
          )}
          {removeButton && (
            <div className="mt-1 border-t border-line px-1 pt-1 [&>button]:w-full [&>button]:justify-start [&>button]:border-0 [&>button]:text-danger">
              {removeButton}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
