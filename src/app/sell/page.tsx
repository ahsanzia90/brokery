import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getBrand } from "@/lib/config/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCurrentUser } from "@/lib/auth/session";
import { getPopularCommodities } from "@/lib/data/taxonomy";
import { SellStart } from "@/components/seller/sell-start";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return buildMetadata({ path: "/sell", title: `Sell commodities in Pakistan — list your maal free on ${brand.name}`, description: "List rice, wheat, cement, steel, scrap and other commodities with quantity and location. Receive buyer enquiries directly. Free, no commission." });
}

export default async function SellPage() {
  const { t, locale } = await getT();
  const [brand, user, popular] = await Promise.all([getBrand(), getCurrentUser(), getPopularCommodities(12)]);
  const name = (c: { nameEn: string; nameUr: string | null }) => (locale === "ur" && c.nameUr ? c.nameUr : c.nameEn);
  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">{t("sell.title", { brand: brand.name })}</h1>
      <p className="mt-2 text-text-muted">{t("sell.sub")}</p>

      <div className="card mt-6 p-5">
        <h2 className="text-lg font-bold">{t("sell.pick")}</h2>
        <p className="mb-3 text-sm text-text-muted">{t("sell.pickHint")}</p>
        <SellStart signedIn={Boolean(user)} />
        <ul className="mt-3 flex flex-wrap gap-2">
          {popular.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/seller/listings/new?commodity=${c.slug}`} className="inline-block min-h-[40px] rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary">
                {name(c)}
              </Link>
            </li>
          ))}
        </ul>
        {!user && <p className="mt-3 text-sm text-text-muted">{t("sell.loginNote")}</p>}
      </div>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <li key={n} className="card p-5">
            <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-white num" aria-hidden>
              {n}
            </span>
            <h3 className="text-lg font-bold">{t(`sell.step${n}.title`)}</h3>
            <p className="mt-1 text-text-muted">{t(`sell.step${n}.body`)}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-sm text-text-muted">{t("home.free")}</p>
      <p className="mt-2 text-center text-sm">
        <Link href="/verification-policy" className="font-semibold text-primary underline-offset-2 hover:underline">
          {t("sell.verificationNote")}
        </Link>
      </p>
    </div>
  );
}
