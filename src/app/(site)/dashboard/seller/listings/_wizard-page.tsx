import { getAllCategories, getCommodityBySlug } from "@/lib/data/taxonomy";
import { getProvinces } from "@/lib/data/locations";
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "@/lib/storage/images";
import { ListingWizard, type WizardState } from "@/components/seller/listing-wizard";
import type { CommodityOption } from "@/components/seller/commodity-picker";
import type { BusinessRow } from "@/lib/business/queries";
import { db } from "@/db";
import { categories as categoriesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Shared server-side assembly for the create/edit wizard pages. */
export async function WizardPage({ mode, listingId, initial, commoditySlug, business, editNote }: { mode: "create" | "edit"; listingId?: string; initial?: Partial<WizardState>; commoditySlug?: string | null; business: BusinessRow; editNote?: boolean }) {
  const [cats, provinces] = await Promise.all([getAllCategories(), getProvinces()]);
  let initialCommodity: CommodityOption | null = null;
  if (commoditySlug) {
    const c = await getCommodityBySlug(commoditySlug);
    if (c && c.status === "active") {
      const [cat] = await db.select({ nameEn: categoriesTable.nameEn, nameUr: categoriesTable.nameUr }).from(categoriesTable).where(eq(categoriesTable.id, c.categoryId)).limit(1);
      initialCommodity = { id: c.id, slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr, categoryName: cat?.nameEn ?? null, categoryNameUr: cat?.nameUr ?? null };
    }
  }
  return (
    <ListingWizard
      mode={mode}
      listingId={listingId}
      initial={initial}
      initialCommodity={initialCommodity}
      categories={cats.filter((c) => c.status === "active").map((c) => ({ id: c.id, parentId: c.parentId, nameEn: c.nameEn, nameUr: c.nameUr, icon: c.icon }))}
      provinces={provinces.map((p) => ({ id: p.id, nameEn: p.nameEn, nameUr: p.nameUr, parentId: p.parentId }))}
      business={{ phone: business.publicPhone, whatsapp: business.whatsappNumber }}
      maxImageBytes={MAX_IMAGE_BYTES}
      maxDocBytes={MAX_DOCUMENT_BYTES}
      editNote={editNote}
    />
  );
}
