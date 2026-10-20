import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { getPriceSources } from "@/lib/prices/queries";
import { SourceForm, SourceToggle } from "@/components/admin/prices/source-form";
import { db } from "@/db";
import { marketPrices } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PriceSourcesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdminPage("prices.edit");
  const sp = await searchParams;
  const sources = await getPriceSources();
  const usage = await db.select({ sourceId: marketPrices.sourceId, n: count() }).from(marketPrices).where(eq(marketPrices.status, "published")).groupBy(marketPrices.sourceId);
  const usageMap = new Map(usage.map((u) => [u.sourceId, u.n]));
  const editing = sp.edit ? sources.find((s) => s.id === sp.edit) ?? null : null;
  return (
    <div>
      <AdminPageHeader title="Price sources" description="Where rates come from: market committees, government bulletins, trade associations, supplier surveys. Every published rate names its source." breadcrumbs={[{ label: "Market prices", href: "/admin/prices" }, { label: "Sources" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>URL / reference</Th>
              <Th className="text-end">Published rates</Th>
              <Th>Active</Th>
              <Th>Updated</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && <EmptyRow colSpan={7}>No sources yet. Add the first one using the form.</EmptyRow>}
            {sources.map((s) => (
              <tr key={s.id} className={s.isActive ? "" : "opacity-60"}>
                <Td className="font-semibold">{s.name}</Td>
                <Td className="text-sm">{s.sourceType.replace(/_/g, " ")}</Td>
                <Td className="text-sm break-all">
                  {s.url && <a href={s.url} target="_blank" rel="noopener" className="text-primary underline">{s.url}</a>}
                  {s.reference && <span className="block text-muted">{s.reference}</span>}
                </Td>
                <Td className="text-end num">{usageMap.get(s.id) ?? 0}</Td>
                <Td><SourceToggle id={s.id} active={Boolean(s.isActive)} /></Td>
                <Td className="text-sm num">{formatDate(s.updatedAt)}</Td>
                <Td><a href={`/admin/prices/sources?edit=${s.id}`} className="text-sm font-semibold text-primary underline">Edit</a></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <SourceForm key={editing?.id ?? "new"} initial={editing ? { id: editing.id, name: editing.name, sourceType: editing.sourceType, url: editing.url, reference: editing.reference, isActive: Boolean(editing.isActive) } : null} />
      </div>
    </div>
  );
}
