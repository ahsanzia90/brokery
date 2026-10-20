import { desc } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import { AdminPageHeader, EmptyRow, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { deleteRedirectAction, saveRedirectAction } from "../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

const inp = "min-h-[40px] w-full rounded-[var(--radius)] border border-line-strong bg-surface px-2 py-1 text-sm font-latin";

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("seo.manage");
  const sp = await searchParams;
  const rows = await db.select().from(redirects).orderBy(desc(redirects.updatedAt));
  return (
    <div>
      <AdminPageHeader title="Redirects" description="Applied when a visitor hits a path that no longer exists (old category/commodity slugs, removed pages). Slug changes in the taxonomy add rows here automatically. 410 marks a page as permanently gone." breadcrumbs={[{ label: "SEO", href: "/admin/seo" }, { label: "Redirects" }]} />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form action={saveRedirectAction} className="card mb-6 grid gap-2 p-4 sm:grid-cols-[1fr_1fr_120px_90px_auto]">
        <input name="sourcePath" required placeholder="/old-path" className={inp} aria-label="Source path" />
        <input name="destinationPath" placeholder="/new-path or https://…" className={inp} aria-label="Destination" />
        <select name="statusCode" defaultValue="301" className={inp} aria-label="Status code"><option value="301">301 permanent</option><option value="302">302 temporary</option><option value="410">410 gone</option></select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked /> active</label>
        <Button type="submit" size="sm">+ Add</Button>
      </form>
      <Table>
        <thead><tr><Th>Source</Th><Th>Destination</Th><Th>Code</Th><Th>Active</Th><Th>Hits</Th><Th></Th></tr></thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No redirects.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td colSpan={4} className="border-b border-line px-3 py-2 align-top">
                <form action={saveRedirectAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_90px_auto]">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="sourcePath" defaultValue={r.sourcePath} className={inp} aria-label="Source" />
                  <input name="destinationPath" defaultValue={r.destinationPath} className={inp} aria-label="Destination" />
                  <select name="statusCode" defaultValue={String(r.statusCode)} className={inp} aria-label="Code"><option value="301">301</option><option value="302">302</option><option value="410">410</option></select>
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={r.isActive} /> {r.isActive ? <Badge tone="success">on</Badge> : <Badge tone="neutral">off</Badge>}</label>
                  <button className={buttonClass("outline", "sm")}>Save</button>
                </form>
              </td>
              <Td className="num">{r.hitCount}</Td>
              <Td>
                <form action={deleteRedirectAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-sm text-danger hover:underline">Delete</button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
