import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { PHOTO_SPEC, photoSrc } from "@/lib/visual/photos";
import credits from "@/lib/visual/credits.json";

type Credit = { key: string; origin: "local" | "download" | "fallback"; source?: string; title?: string; author?: string; page?: string; licence?: string };

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/photo-credits", title: "Photo credits", description: "Photographers and sources of the commodity photographs shown on the site." });
}

export default async function PhotoCreditsPage() {
  const { t } = await getT();
  const subjects = new Map(PHOTO_SPEC.map((s) => [s.key, s.subject]));
  const rows = (credits as Credit[]).filter((c) => c.origin === "download" || c.origin === "fallback");
  return (
    <div className="container-page py-5 md:py-6">
      <Breadcrumbs items={[{ label: t("footer.photoCredits") }]} homeLabel={t("common.home")} />
      <PageHeader eyebrow={t("footer.company")} title={t("footer.photoCredits")} subtitle={t("credits.sub")} />
      {rows.length === 0 ? (
        <p className="text-[15px] text-ink-2">{t("credits.none")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <li key={c.key} className="overflow-hidden rounded-r-lg border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(c.key)} alt={subjects.get(c.key) ?? c.key} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="p-4 text-[14px]">
                <p className="font-semibold text-ink">{subjects.get(c.key) ?? c.key}</p>
                {c.origin === "download" ? (
                  <p className="mt-1 text-ink-2">
                    {c.title ? `“${c.title}”` : null}
                    {c.author ? ` — ${c.author}` : null}
                    {c.page ? (
                      <>
                        {" · "}
                        <a href={c.page} rel="noopener noreferrer nofollow" target="_blank" className="text-brand-800 underline-offset-2 hover:underline">{c.source}</a>
                      </>
                    ) : null}
                    {c.licence ? <span className="text-muted"> · {c.licence}</span> : null}
                  </p>
                ) : (
                  <p className="mt-1 text-ink-2">{t("credits.bundled")}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
