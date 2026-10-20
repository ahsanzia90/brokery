import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { SearchBar } from "@/components/layout/search-bar";
import { LinkButton } from "@/components/ui/button";
import { CommodityArt } from "@/components/illustrations/commodity-art";

export const metadata: Metadata = { title: "Page not found", ...NOINDEX };

/** Custom 404. Redirect lookups happen in pages via redirectOr404() before this renders. */
export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-page py-10 md:py-16">
      <div className="panel panel-sand mx-auto max-w-2xl text-center !py-12">
        <CommodityArt artKey="generic" className="mx-auto h-24 w-24" />
        <p className="eyebrow mt-4">404</p>
        <h1 className="mt-2 text-[28px] font-extrabold text-ink md:text-[36px]">{t("error.404.title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">{t("error.404.body")}</p>
        <p className="mt-8 mb-2 text-[14px] font-semibold text-ink">{t("browse.404Hint")}</p>
        <div className="mx-auto max-w-md">
          <SearchBar />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/" variant="primary">
            {t("error.goHome")}
          </LinkButton>
          <LinkButton href="/categories" variant="outline" className="bg-white/70">
            {t("category.title")}
          </LinkButton>
          <LinkButton href="/suppliers" variant="outline" className="bg-white/70">
            {t("nav.suppliers")}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
