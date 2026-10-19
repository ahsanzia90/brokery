"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { deleteDraftAction, setListingStatusAction } from "@/lib/listings/actions";
import type { StatusAction } from "@/lib/listings/schema";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

export function ListingRowActions({ listingId, slug, status }: { listingId: string; slug: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (action: StatusAction) =>
    start(async () => {
      const res = await setListingStatusAction(listingId, action);
      if (res.ok) {
        toast.push(t("mylist.updated"), "success");
        router.refresh();
      } else toast.push(t("common.error"), "error");
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status === "published" && (
        <Link href={`/listings/${slug}`} className={buttonClass("ghost", "sm")}>
          {t("mylist.preview")}
        </Link>
      )}
      <Link href={`/dashboard/seller/listings/${listingId}/edit`} className={buttonClass("outline", "sm")}>
        {t("action.edit")}
      </Link>
      {status === "published" && (
        <>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run("pause")}>
            {t("action.pause")}
          </Button>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run("sold_out")}>
            {t("action.markSoldOut")}
          </Button>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run("refresh")}>
            {t("listing.refresh")}
          </Button>
        </>
      )}
      {(status === "paused" || status === "expired") && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => run("resume")}>
          {t("action.resume")}
        </Button>
      )}
      {status === "sold_out" && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => run("available")}>
          {t("action.markAvailable")}
        </Button>
      )}
      {status === "draft" ? (
        <ConfirmButton
          title={t("mylist.deleteDraft")}
          confirmLabel={t("action.delete")}
          cancelLabel={t("action.cancel")}
          onConfirm={async () => {
            const res = await deleteDraftAction(listingId);
            if (res.ok) router.refresh();
            else toast.push(t("common.error"), "error");
          }}
        >
          {t("mylist.deleteDraft")}
        </ConfirmButton>
      ) : (
        status !== "removed" && (
          <ConfirmButton
            title={t("mylist.removeConfirm")}
            body={t("mylist.removeBody")}
            confirmLabel={t("action.remove")}
            cancelLabel={t("action.cancel")}
            onConfirm={async () => {
              const res = await setListingStatusAction(listingId, "remove");
              if (res.ok) router.refresh();
              else toast.push(t("common.error"), "error");
            }}
          >
            {t("action.remove")}
          </ConfirmButton>
        )
      )}
    </div>
  );
}
