import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { units } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { getSetting } from "@/lib/config/settings";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("taxonomy.manage");
  const sp = await searchParams;
  const rows = await db.select().from(units).orderBy(asc(units.unitType), asc(units.sortOrder), asc(units.nameEn));
  const maundKg = await getSetting<number>("units.maund_kg", 40);
  return (
    <div>
      <AdminPageHeader title="Units" description="Quantities are always stored in the unit the user entered. A kilogram equivalent is computed only when a valid factor exists." breadcrumbs={[{ label: "Taxonomy", href: "/admin/taxonomy" }, { label: "Units" }]} actions={<Link href="/admin/taxonomy/units/new" className={buttonClass("primary", "sm")}>+ New unit</Link>} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <Alert tone="info" className="mb-4">
        The maund → kg value used for normalisation comes from <Link href="/admin/settings" className="underline">Settings › Units</Link> (currently <span className="num">{maundKg} kg</span>), not from the unit row below, because market definitions vary.
      </Alert>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Code</Th>
            <Th>Symbol</Th>
            <Th>Type</Th>
            <Th>Factor to base</Th>
            <Th>Applies to</Th>
            <Th>Status</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={8}>No units yet.</EmptyRow>}
          {rows.map((u) => (
            <tr key={u.id}>
              <Td>{u.nameEn} {u.nameUr && <span className="text-muted" lang="ur">({u.nameUr})</span>}</Td>
              <Td><code className="text-xs">{u.code}</code></Td>
              <Td>{u.symbol}</Td>
              <Td>{u.unitType}</Td>
              <Td className="num">{u.code === "maund" ? `${maundKg} (from settings)` : u.baseFactor ?? <span className="text-muted">— not convertible</span>}</Td>
              <Td className="text-xs">{u.applicableKinds.length ? u.applicableKinds.join(", ") : "all"}</Td>
              <Td><Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status}</Badge></Td>
              <Td><Link href={`/admin/taxonomy/units/${u.id}/edit`} className="adm-link">Edit</Link></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
