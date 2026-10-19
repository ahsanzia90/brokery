"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { buttonClass } from "@/components/ui/button";
import { CommodityPicker, type CommodityOption } from "./commodity-picker";

export function SellStart({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [c, setC] = useState<CommodityOption | null>(null);
  const target = c ? `/dashboard/seller/listings/new?commodity=${c.slug}` : "/dashboard/seller/listings/new";
  const href = signedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  return (
    <div>
      <CommodityPicker value={c} onChange={setC} />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={href} className={buttonClass("primary", "lg", "flex-1")}>
          {t("sell.start")} ›
        </Link>
        {!c && (
          <Link href={signedIn ? "/dashboard/seller/listings/new" : `/login?next=${encodeURIComponent("/dashboard/seller/listings/new")}`} className={buttonClass("ghost", "lg")}>
            {t("sell.startWithout")}
          </Link>
        )}
      </div>
    </div>
  );
}
