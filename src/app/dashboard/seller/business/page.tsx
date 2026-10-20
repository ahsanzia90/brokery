import { getSellerContext } from "@/lib/business/context";
import { getBusinessCommodities } from "@/lib/business/queries";
import { getProvinces } from "@/lib/data/locations";
import { MAX_IMAGE_BYTES } from "@/lib/storage/images";
import { BusinessForm } from "@/components/seller/business-form";
import { formatPhoneLocal } from "@/lib/utils/phone";
import { DashHeader } from "@/components/flows/dashboard-shell";

export default async function BusinessProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { user, business, t } = await getSellerContext("/dashboard/seller/business");
  const [provinces, comms] = await Promise.all([getProvinces(), business ? getBusinessCommodities(business.id) : Promise.resolve([])]);
  const initial = {
    name: business?.name ?? "",
    businessType: business?.businessType ?? "trader",
    description: business?.description ?? "",
    contactPersonName: business?.contactPersonName ?? user.name,
    addressLine: business?.addressLine ?? "",
    provinceId: business?.provinceId ?? "",
    cityId: business?.cityId ?? "",
    marketId: business?.marketId ?? "",
    publicPhone: business?.publicPhone ? formatPhoneLocal(business.publicPhone) : "",
    whatsappNumber: business?.whatsappNumber ? formatPhoneLocal(business.whatsappNumber) : "",
    showPhonePublicly: business?.showPhonePublicly ?? false,
    showWhatsappPublicly: business?.showWhatsappPublicly ?? false,
    showAddressPublicly: business?.showAddressPublicly ?? false,
    website: business?.website ?? "",
    yearsInBusiness: business?.yearsInBusiness?.toString() ?? "",
    languages: business?.languages ?? ["ur"],
    registrationNumber: business?.registrationNumber ?? "",
    logoPath: business?.logoPath ?? null,
  };
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <div>
      <DashHeader title={t("biz.title")} description={t("biz.sub")} />
      <BusinessForm initial={initial} initialCommodities={comms} provinces={provinces.map((p) => ({ id: p.id, nameEn: p.nameEn, nameUr: p.nameUr, parentId: p.parentId, type: p.type }))} userPhone={user.phone} maxImageBytes={MAX_IMAGE_BYTES} isNew={!business} nextPath={safeNext} />
    </div>
  );
}
