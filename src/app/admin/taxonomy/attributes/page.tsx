import Link from "next/link";
import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attributeDefinitions, categoryAttributes } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function AttributesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  const rows = await db
    .select({ a: attributeDefinitions, uses: sql<number>`(SELECT count(*) FROM category_attributes ca WHERE ca.attribute_id = ${attributeDefinitions.id})` })
    .from(attributeDefinitions)
    .orderBy(asc(attributeDefinitions.nameEn));
  void categoryAttributes;
  void count;
  void eq;
  return (
    <div>
      <AdminPageHeader title="Attributes" description="Reusable specification fields (broken %, GSM, thickness…). Attach them to categories or commodities from their edit pages." breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Attributes" }]} actions={<Link href="/admin/taxonomy/attributes/new" className={buttonClass("primary", "sm")}>+ New attribute</Link>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Key</Th>
            <Th>Type</Th>
            <Th>Unit</Th>
            <Th>Filterable</Th>
            <Th>Used by</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={7}>No attributes defined yet.</EmptyRow>}
          {rows.map(({ a, uses }) => (
            <tr key={a.id}>
              <Td>
                {a.nameEn} {a.nameUr && <span className="text-muted" lang="ur">({a.nameUr})</span>}
              </Td>
              <Td><code className="text-xs">{a.key}</code></Td>
              <Td>{a.type}</Td>
              <Td>{a.unitLabel ?? ""}</Td>
              <Td>{a.isFilterable ? <Badge tone="success">yes</Badge> : <span className="text-muted">no</span>}</Td>
              <Td className="num">{uses}</Td>
              <Td><Link href={`/admin/taxonomy/attributes/${a.id}/edit`} className="adm-link">Edit</Link></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
