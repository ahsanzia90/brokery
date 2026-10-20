import Link from "next/link";
import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { getSetting } from "@/lib/config/settings";
import { AdminPageHeader, AdminPagination, Chip, EmptyRow, FilterBar, FilterCheck, Labeled, RowActions, StatStrip, Table, Td, Th } from "@/components/admin/ui";
import { int, qs, str, type SearchParams } from "@/lib/admin/params";
import { countStalePrices, getCommoditiesWithPrices, getPriceStatusCounts, listPricesAdmin, type PriceStatus, type PriceType } from "@/lib/prices/queries";
import { PRICE_TYPES } from "@/lib/prices/service";
import { priceRowAction } from "@/lib/prices/actions";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

import { buttonClass } from "@/components/ui/button";
import { getAllLocations } from "@/lib/data/locations";
import { formatDate, formatPKR } from "@/lib/utils/format";
import { db } from "@/db";
import { commodities } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const STATUSES: PriceStatus[] = ["draft", "pending_review", "published", "superseded", "expired", "rejected"];

function statusTone(s: string) {
  return s === "published" ? "success" : s === "pending_review" ? "warning" : s === "rejected" ? "danger" : s === "draft" ? "info" : "neutral";
}

export default async function AdminPricesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("prices.edit");
  const canPublish = hasPermission(user.roles, "prices.publish");
  const sp = await searchParams;
  const staleDays = await getSetting<number>("prices.stale_after_days", 7);
  const page = int(sp, "page", 1);
  const filters = {
    status: str(sp, "status") as PriceStatus | "",
    commodityId: str(sp, "commodity"),
    locationId: str(sp, "location"),
    priceType: str(sp, "type") as PriceType | "",
    from: str(sp, "from"),
    to: str(sp, "to"),
    staleOnly: str(sp, "stale") === "1",
  };
  const [{ rows, total, totalPages }, staleCount, counts, commodityOpts, locs] = await Promise.all([
    listPricesAdmin({ ...filters, staleDays, page }),
    countStalePrices(staleDays),
    getPriceStatusCounts(),
    db.select({ id: commodities.id, nameEn: commodities.nameEn }).from(commodities).where(eq(commodities.status, "active")).orderBy(asc(commodities.nameEn)),
    getAllLocations(),
  ]);
  const withPrices = new Set((await getCommoditiesWithPrices()).map((c) => c.id));
  const cityOpts = locs.filter((l) => l.type === "city" || l.type === "market");
  const base = (p: Record<string, string | number | undefined>) => qs("/admin/prices", { status: filters.status, commodity: filters.commodityId, location: filters.locationId, type: filters.priceType, from: filters.from, to: filters.to, stale: filters.staleOnly ? 1 : undefined, ...p });

  return (
    <div>
      <AdminPageHeader
        title="Market prices"
        description="Create, review, publish and expire market rates. Every published rate carries a source, unit and observation date."
        actions={
          <>
            <Link href="/admin/prices/import" className={buttonClass("outline", "sm")}>
              Import CSV
            </Link>
            <Link href="/admin/prices/new" className={buttonClass("primary", "sm")}>
              + New price
            </Link>
          </>
        }
      />
      {str(sp, "done") && <Alert tone="success" className="mb-4">Done: {str(sp, "done")}.</Alert>}
      {str(sp, "error") && <Alert tone="danger" className="mb-4">Action failed: {str(sp, "error")}</Alert>}

      <StatStrip
        className="mb-5"
        items={[
          { label: "Published", value: counts.published ?? 0, href: base({ status: "published", stale: undefined, page: 1 }) },
          { label: "Pending review", value: counts.pending_review ?? 0, href: base({ status: "pending_review", stale: undefined, page: 1 }), tone: (counts.pending_review ?? 0) > 0 ? "warning" : "default" },
          { label: `Stale (> ${staleDays} days)`, value: staleCount, href: base({ status: "", stale: 1, page: 1 }), tone: staleCount > 0 ? "warning" : "default", hint: "Published but older than the stale threshold" },
          { label: "Drafts", value: counts.draft ?? 0, href: base({ status: "draft", stale: undefined, page: 1 }) },
        ]}
      />

      <FilterBar action="/admin/prices" resetHref="/admin/prices">
        <Labeled label="Status"><select name="status" defaultValue={filters.status} className="adm-control">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select></Labeled>
        <Labeled label="Commodity"><select name="commodity" defaultValue={filters.commodityId} className="adm-control">
            <option value="">All</option>
            {commodityOpts.filter((c) => withPrices.has(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.nameEn}</option>
            ))}
            <option disabled>──────────</option>
            {commodityOpts.filter((c) => !withPrices.has(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.nameEn}</option>
            ))}
          </select></Labeled>
        <Labeled label="Location"><select name="location" defaultValue={filters.locationId} className="adm-control">
            <option value="">All</option>
            {cityOpts.map((l) => (
              <option key={l.id} value={l.id}>{l.nameEn}{l.type === "market" ? " (market)" : ""}</option>
            ))}
          </select></Labeled>
        <Labeled label="Type"><select name="type" defaultValue={filters.priceType} className="adm-control">
            <option value="">All</option>
            {PRICE_TYPES.map((p) => (
              <option key={p} value={p}>{p.replace("_", " ")}</option>
            ))}
          </select></Labeled>
        <Labeled label="From"><input type="date" name="from" defaultValue={filters.from} className="adm-control font-latin" /></Labeled>
        <Labeled label="To"><input type="date" name="to" defaultValue={filters.to} className="adm-control font-latin" /></Labeled>
        <FilterCheck name="stale" label="Stale only" checked={filters.staleOnly} />
      </FilterBar>

      <p className="mb-2 text-[12px] text-muted num">{total} records</p>
      <Table>
        <thead>
          <tr>
            <Th>Commodity</Th>
            <Th>Location</Th>
            <Th className="text-end">Rate</Th>
            <Th>Type</Th>
            <Th>Observed</Th>
            <Th>Source</Th>
            <Th>Status</Th>
            <Th>Reviewer</Th>
            <Th className="text-end">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={9}>No price records match these filters. Create one with “New price” or import a CSV.</EmptyRow>}
          {rows.map((r) => {
            const stale = r.p.status === "published" && (Date.now() - new Date(r.p.observationDate).getTime()) / 86_400_000 > staleDays;
            return (
              <tr key={r.p.id}>
                <Td>
                  <Link href={`/admin/prices/${r.p.id}`} className="font-semibold hover:underline">{r.commodity.nameEn}</Link>
                  {r.variety && <span className="block text-sm text-muted">{r.variety.nameEn}{r.grade ? ` · ${r.grade.nameEn}` : ""}</span>}
                  {!r.variety && r.grade && <span className="block text-sm text-muted">{r.grade.nameEn}</span>}
                </Td>
                <Td>{r.loc.nameEn}{r.loc.type === "market" ? <span className="text-xs text-muted"> (market)</span> : null}</Td>
                <Td className="text-end num whitespace-nowrap">
                  {formatPKR(r.p.amount)} / {r.unit.symbol}
                  {r.p.changePercent && Number(r.p.changePercent) !== 0 && <span className={`block text-xs ${Number(r.p.changePercent) > 0 ? "text-danger" : "text-primary"}`}>{Number(r.p.changePercent) > 0 ? "▲" : "▼"} {Math.abs(Number(r.p.changePercent)).toFixed(1)}%</span>}
                </Td>
                <Td><Chip>{r.p.priceType.replace("_", " ")}</Chip></Td>
                <Td className="num whitespace-nowrap">
                  {formatDate(r.p.observationDate)}
                  {stale && <Badge tone="warning" className="ms-1">stale</Badge>}
                </Td>
                <Td className="text-[13px]">{r.source?.name ?? <Badge tone="danger">missing</Badge>}</Td>
                <Td><Badge tone={statusTone(r.p.status)}>{r.p.status.replace("_", " ")}</Badge></Td>
                <Td className="text-[13px]">{r.reviewer?.name ?? <span className="text-muted-2">—</span>}</Td>
                <Td className="text-end">
                  <RowActions>
                    <Link href={`/admin/prices/${r.p.id}`}>View &amp; history</Link>
                    {["draft", "pending_review", "published"].includes(r.p.status) && <Link href={`/admin/prices/${r.p.id}/edit`}>Edit</Link>}
                    {canPublish && ["draft", "pending_review"].includes(r.p.status) && (
                      <form action={priceRowAction}>
                        <input type="hidden" name="id" value={r.p.id} />
                        <input type="hidden" name="op" value="publish" />
                        <input type="hidden" name="back" value={base({ page })} />
                        <button type="submit" className="text-brand-800">Publish</button>
                      </form>
                    )}
                    {canPublish && r.p.status === "published" && (
                      <form action={priceRowAction}>
                        <input type="hidden" name="id" value={r.p.id} />
                        <input type="hidden" name="op" value="expire" />
                        <input type="hidden" name="back" value={base({ page })} />
                        <button type="submit" className="text-danger">Expire now</button>
                      </form>
                    )}
                  </RowActions>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <AdminPagination page={page} totalPages={totalPages} makeHref={(p) => base({ page: p })} />
    </div>
  );
}
