import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Percent, ShieldCheck } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { getBrand } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCurrentUser } from "@/lib/auth/session";
import { getPopularCommodities } from "@/lib/data/taxonomy";
import { SellStart } from "@/components/seller/sell-start";
import { PageHeader } from "@/components/ui/section";
import { StepPanel } from "@/components/public/steps";
import { Chip, ChipRow } from "@/components/public/chip";
import { CommodityArt } from "@/components/illustrations/commodity-art";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return buildMetadata({ path: "/sell", title: `Sell commodities in Pakistan — list your maal free on ${brand.name}`, description: "List rice, wheat, cement, steel, scrap and other commodities with quantity and location. Receive buyer enquiries directly. Free, no commission." });
}

export default async function SellPage() {
  const { t, locale } = await getT();
  const [brand, user, popular] = await Promise.all([getBrand(), getCurrentUser(), getPopularCommodities(12)]);
  const name = (c: { nameEn: string; nameUr: string | null }) => (locale === "ur" && c.nameUr ? c.nameUr : c.nameEn);
  return (
    <div className="container-page py-6 md:py-10">
      <PageHeader eyebrow={t("home.sell.en")} title={t("sell.title", { brand: brand.name })} subtitle={t("sell.sub")} />
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr] md:gap-5">
        <ol className="contents">
          <StepPanel n={1} title={t("sell.pick")} body={t("sell.pickHint")} tint="panel-lavender">
            <SellStart signedIn={Boolean(user)} />
            <ChipRow className="mt-4">
              {popular.map((c) => (
                <li key={c.id}>
                  <Chip href={`/dashboard/seller/listings/new?commodity=${c.slug}`} size="sm" className="bg-white/80">
                    {name(c)}
                  </Chip>
                </li>
              ))}
            </ChipRow>
            {!user && <p className="mt-4 text-[13px] text-muted">{t("sell.loginNote")}</p>}
          </StepPanel>
          <div className="grid min-w-0 gap-4">
            <StepPanel n={2} title={t("sell.step2.title")} body={t("sell.step2.body")} tint="panel-mint" className="!p-6" />
            <StepPanel n={3} title={t("sell.step3.title")} body={t("sell.step3.body")} tint="panel-peach" className="!p-6">
              <div className="overflow-hidden rounded-[var(--r-md)] border border-black/5 bg-white">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-tint-sand">
                    <CommodityArt artKey="grains" className="h-10 w-10" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-ink">{t("home.sell.previewTitle")}</p>
                    <p className="text-[12px] text-muted num">{t("home.sell.previewMeta")}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-brand-800">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("home.sell.previewBiz")}
                    </p>
                  </div>
                </div>
              </div>
            </StepPanel>
          </div>
        </ol>
      </div>
      <ul className="mt-8 grid gap-3 text-[14px] text-ink-2 sm:grid-cols-3">
        <li className="flex items-center gap-2"><Percent className="h-4 w-4 text-brand-700" aria-hidden /> {t("home.free")}</li>
        <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden /> <Link href="/verification-policy" className="font-semibold text-brand-800 underline-offset-4 hover:underline">{t("sell.verificationNote")}</Link></li>
        <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-700" aria-hidden /> <Link href="/listing-policy" className="font-semibold text-brand-800 underline-offset-4 hover:underline">{t("footer.listingPolicy")}</Link></li>
      </ul>
    </div>
  );
}
