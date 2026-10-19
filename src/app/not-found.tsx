import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { NOINDEX } from "@/lib/seo/metadata";
import { SearchBar } from "@/components/layout/search-bar";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", ...NOINDEX };

/** Custom 404. Redirect lookups happen in pages via redirectOr404() before this renders. */
export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-xl py-16 text-center">
      <p className="text-6xl font-extrabold text-primary-strong num" aria-hidden>
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold">{t("error.404.title")}</h1>
      <p className="mt-2 text-text-muted">{t("error.404.body")}</p>
      <p className="mt-6 mb-2 font-semibold">{t("browse.404Hint")}</p>
      <SearchBar />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href="/" variant="primary">
          {t("error.goHome")}
        </LinkButton>
        <LinkButton href="/categories" variant="outline">
          {t("category.title")}
        </LinkButton>
        <LinkButton href="/suppliers" variant="outline">
          {t("nav.suppliers")}
        </LinkButton>
      </div>
    </div>
  );
}
