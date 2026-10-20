import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, homepageSections, siteSettings } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz/guards";
import type { FooterLink } from "@/lib/admin/content-service";
import { AdminPageHeader, Table, Td, Th } from "@/components/admin/ui";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveFooterLinksAction, saveHomepageSectionsAction } from "../actions";
import type { SearchParams } from "@/lib/admin/params";
import { str } from "@/lib/admin/params";

const inp = "min-h-[40px] w-full rounded-[var(--radius)] border border-line-strong bg-surface px-2 py-1 text-sm";
const HINTS: Record<string, string> = {
  hero: "Buyer / seller choice. Always shown first.",
  search: "Commodity search box with popular chips.",
  categories: "Featured categories (set “Featured” on a category). Config: {\"limit\": 8}",
  prices: "Today's published rates. Config: {\"limit\": 8}",
  listings: "Recently added listings. Config: {\"limit\": 6}",
  suppliers: "Verified suppliers only; hidden automatically when none exist. Config: {\"limit\": 6}",
  how_it_works: "Three steps.",
  browse_categories: "Full category list.",
  browse_cities: "Major market cities (set “Major market” on a city).",
  guides: "Latest published guides. Config: {\"limit\": 3}",
};

export default async function HomepageAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("content.manage");
  const sp = await searchParams;
  const sections = await db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
  const featuredCats = await db.select({ id: categories.id, nameEn: categories.nameEn }).from(categories).where(eq(categories.isFeatured, true)).orderBy(asc(categories.sortOrder));
  const featuredSuppliers = await db.select({ id: businesses.id, name: businesses.name, verificationLevel: businesses.verificationLevel, featuredUntil: businesses.featuredUntil }).from(businesses).where(eq(businesses.isFeatured, true)).orderBy(desc(businesses.updatedAt)).limit(20);
  const [footer] = await db.select().from(siteSettings).where(eq(siteSettings.key, "footer.links"));
  const footerLinks = (Array.isArray(footer?.value) ? (footer!.value as FooterLink[]) : []).concat([{ labelEn: "", labelUr: "", href: "" }, { labelEn: "", labelUr: "", href: "" }]);

  return (
    <div>
      <AdminPageHeader title="Homepage sections" description="Reorder and enable sections. Empty sections never show fabricated content — they render helpful empty states or hide themselves." />
      <Flash ok={str(sp, "ok")} error={str(sp, "error")} />
      <form action={saveHomepageSectionsAction}>
        <Table>
          <thead>
            <tr><Th>Order</Th><Th>Section</Th><Th>Enabled</Th><Th>Title (EN)</Th><Th>Title (UR)</Th><Th>Config (JSON)</Th></tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.key}>
                <Td><input type="hidden" name="key" value={s.key} /><input type="number" name={`sort_${s.key}`} defaultValue={s.sortOrder} className={`${inp} w-16`} aria-label="Sort order" /></Td>
                <Td><code>{s.key}</code><span className="block text-xs text-muted">{HINTS[s.key] ?? ""}</span></Td>
                <Td><input type="checkbox" name={`enabled_${s.key}`} defaultChecked={s.isEnabled} className="h-5 w-5" aria-label="Enabled" /></Td>
                <Td><input name={`titleEn_${s.key}`} defaultValue={s.titleEn ?? ""} className={inp} aria-label="Title EN" /></Td>
                <Td><input name={`titleUr_${s.key}`} defaultValue={s.titleUr ?? ""} dir="rtl" className={inp} aria-label="Title UR" /></Td>
                <Td><input name={`config_${s.key}`} defaultValue={s.config ? JSON.stringify(s.config) : ""} className={`${inp} font-mono`} aria-label="Config" /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Button type="submit" className="mt-3">Save sections</Button>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-bold">Featured categories</h2>
          <p className="mb-2 text-sm text-muted">Toggle “Featured on homepage” on the category edit page.</p>
          <ul className="flex flex-wrap gap-2">
            {featuredCats.length === 0 && <li className="text-sm text-muted">None flagged — the homepage falls back to the first main categories.</li>}
            {featuredCats.map((c) => <li key={c.id}><Link href={`/admin/taxonomy/categories/${c.id}/edit`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-primary">{c.nameEn}</Link></li>)}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="font-bold">Featured suppliers</h2>
          <p className="mb-2 text-sm text-muted">Managed under <Link href="/admin/businesses" className="text-primary underline">Businesses</Link>. Only document-verified or admin-verified suppliers appear publicly.</p>
          <ul className="space-y-1 text-sm">
            {featuredSuppliers.length === 0 && <li className="text-muted">No featured suppliers.</li>}
            {featuredSuppliers.map((b) => <li key={b.id}>{b.name} <Badge tone="neutral">{b.verificationLevel}</Badge>{b.featuredUntil && <span className="text-muted"> until {b.featuredUntil.toDateString()}</span>}</li>)}
          </ul>
        </section>
      </div>

      <section className="card mt-6 p-4">
        <h2 className="font-bold">Extra footer links</h2>
        <p className="mb-2 text-sm text-muted">Shown in the footer in addition to the built-in links. Leave a row blank to remove it.</p>
        <form action={saveFooterLinksAction}>
          <div className="space-y-2">
            {footerLinks.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                <input name="footer_labelEn" defaultValue={l.labelEn} placeholder="Label (English)" className={inp} />
                <input name="footer_labelUr" defaultValue={l.labelUr} placeholder="لیبل (اردو)" dir="rtl" className={inp} />
                <input name="footer_href" defaultValue={l.href} placeholder="/path or https://…" className={`${inp} font-latin`} />
              </div>
            ))}
          </div>
          <Button type="submit" variant="secondary" className="mt-3">Save footer links</Button>
        </form>
      </section>
    </div>
  );
}
