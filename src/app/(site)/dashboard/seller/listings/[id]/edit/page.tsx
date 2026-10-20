import { notFound, redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { getListingForEdit } from "@/lib/listings/service";
import { WizardPage } from "../../_wizard-page";
import type { WizardState } from "@/components/seller/listing-wizard";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, business, t } = await getSellerContext(`/dashboard/seller/listings/${id}/edit`);
  if (!business) redirect("/dashboard/seller");
  const l = await getListingForEdit({ userId: user.id, businessId: business.id }, id);
  if (!l) notFound();
  if (l.status === "removed") redirect(`/dashboard/seller/listings/${id}`);
  const initial: Partial<WizardState> = {
    varietyId: l.varietyId ?? "",
    customVariety: l.customVariety ?? "",
    gradeId: l.gradeId ?? "",
    customGrade: l.customGrade ?? "",
    title: l.title,
    quantity: String(Number(l.quantity)),
    unitId: l.unitId,
    minOrderQuantity: l.minOrderQuantity ? String(Number(l.minOrderQuantity)) : "",
    minOrderUnitId: l.minOrderUnitId ?? "",
    priceType: l.priceType,
    priceAmount: l.priceAmount ? String(Number(l.priceAmount)) : "",
    priceUnitId: l.priceUnitId ?? "",
    provinceId: l.provinceId ?? "",
    cityId: l.cityId ?? "",
    marketId: l.marketId ?? "",
    pickupLocation: l.pickupLocation ?? "",
    deliveryAvailable: l.deliveryAvailable ?? "ask",
    condition: l.condition ?? "not_applicable",
    packaging: l.packaging ?? "",
    availableFrom: l.availableFrom ?? "",
    description: l.description ?? "",
    images: (l.images ?? []).map((i) => ({ path: i.path, altText: i.altText ?? null })),
    documents: (l.documents ?? []).map((d) => ({ path: d.path, label: d.label, mimeType: d.mimeType, sizeBytes: d.sizeBytes, isPublic: d.isPublic ?? false })),
    attributes: l.attributes ?? {},
    contactPhoneEnabled: l.contactPhoneEnabled ?? true,
    contactWhatsappEnabled: l.contactWhatsappEnabled ?? true,
  };
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {t("action.edit")}: {l.title}
      </h1>
      <WizardPage mode="edit" listingId={id} initial={initial} commoditySlug={l.commoditySlug} business={business} editNote={l.status === "published" || l.status === "paused"} />
    </div>
  );
}
