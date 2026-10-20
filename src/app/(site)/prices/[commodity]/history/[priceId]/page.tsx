import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getSetting } from "@/lib/config/settings";
import { NOINDEX } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { getPriceById, getPriceVersions, toPriceRow } from "@/lib/prices/queries";
import { PriceRow } from "@/components/marketplace/cards";
import { formatDateTime, formatPKR, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Price record history", ...NOINDEX };

export default async function PriceRecordPage({ params }: { params: Promise<{ commodity: string; priceId: string }> }) {
  const { commodity: slug, priceId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(priceId)) notFound();
  const row = await getPriceById(priceId);
  if (!row || row.commodity.slug !== slug || !["published", "superseded", "expired"].includes(row.p.status)) notFound();
  const { t, locale } = await getT();
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const versions = await getPriceVersions(priceId);
  const name = locale === "ur" && row.commodity.nameUr ? row.commodity.nameUr : row.commodity.nameEn;
  const data = toPriceRow(row, locale, staleDays);
  const publicVersions = versions.filter((v) => ["created", "published", "corrected", "superseded", "expired"].includes(v.h.action));
  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: t("price.title"), href: "/prices" }, { label: name, href: `/prices/${slug}` }, { label: t("price.recordDetail") }]} homeLabel={t("common.home")} />
      <PageHeader title={`${t("price.recordDetail")}: ${name}${data.varietyName ? ` — ${data.varietyName}` : ""}`} />
      <div className="mb-2">
        <Badge tone={row.p.status === "published" ? "success" : "neutral"}>{t(`price.status.${row.p.status}`)}</Badge>
      </div>
      <PriceRow p={data} t={t} locale={locale} staleDays={staleDays} />
      <dl className="card mt-4 grid gap-2 p-4 text-[0.95rem] sm:grid-cols-2">
        <div>
          <dt className="text-sm text-text-muted">{t("price.observed")}</dt>
          <dd className="num">{formatDate(row.p.observationDate, locale)}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{t("price.published")}</dt>
          <dd className="num">{row.p.publishedAt ? formatDateTime(row.p.publishedAt, locale) : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{t("common.source")}</dt>
          <dd>
            {row.source?.name ?? "—"}
            {row.source?.url && (
              <>
                {" "}
                <a href={row.source.url} rel="nofollow noopener" target="_blank" className="text-primary underline">
                  ↗
                </a>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{t("price.sourceRef")}</dt>
          <dd className="break-words">{row.p.sourceReference ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{t("price.previous")}</dt>
          <dd className="num">{row.p.previousAmount ? `${formatPKR(row.p.previousAmount)} / ${row.unit.symbol}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{t("price.validUntil")}</dt>
          <dd className="num">{row.p.validUntil ? formatDateTime(row.p.validUntil, locale) : "—"}</dd>
        </div>
        {row.p.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-muted">{t("common.notes")}</dt>
            <dd className="whitespace-pre-line">{row.p.notes}</dd>
          </div>
        )}
      </dl>
      <h2 className="mb-3 mt-8 text-xl font-bold">{t("price.versions")}</h2>
      <ol className="space-y-2">
        {publicVersions.map((v) => {
          const snap = v.h.snapshot as { amount?: string };
          return (
            <li key={v.h.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <span className="font-semibold">{t(`price.action.${v.h.action}`)}</span>
                {v.h.action === "corrected" && v.h.reason && <span className="block text-sm text-text-muted">{v.h.reason}</span>}
                {v.h.changedFields.includes("amount") && snap.amount && <span className="block text-sm text-text-muted num">→ {formatPKR(snap.amount)}</span>}
              </div>
              <span className="text-sm text-text-muted num">
                v{v.h.version} · {formatDateTime(v.h.createdAt, locale)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6">
        <Link href={`/prices/${slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">
          ‹ {t("price.inPakistan", { name })}
        </Link>
      </p>
    </div>
  );
}
