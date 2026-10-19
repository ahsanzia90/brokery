import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { AdminPageHeader } from "@/components/admin/ui";
import { PriceForm } from "@/components/admin/prices/price-form";
import { locationGroupsForForm, sourceOptions } from "@/components/admin/prices/shared";
import { PRICE_TYPES } from "@/lib/prices/service";
import { getCommodityBySlug } from "@/lib/data/taxonomy";

export const dynamic = "force-dynamic";

export default async function NewPricePage({ searchParams }: { searchParams: Promise<{ commodity?: string }> }) {
  const user = await requireAdminPage("prices.edit");
  const sp = await searchParams;
  const preset = sp.commodity ? await getCommodityBySlug(sp.commodity) : null;
  const [locations, sources] = await Promise.all([locationGroupsForForm(), sourceOptions()]);
  return (
    <div>
      <AdminPageHeader title="New market price" breadcrumbs={[{ label: "Market prices", href: "/admin/prices" }, { label: "New" }]} description="Save as a draft, submit for review, or publish directly if you have the publish permission." />
      <PriceForm initial={preset ? { commodityId: preset.id, commodityName: preset.nameEn } : {}} locations={locations} sources={sources} priceTypes={[...PRICE_TYPES]} canPublish={hasPermission(user.roles, "prices.publish")} />
    </div>
  );
}
