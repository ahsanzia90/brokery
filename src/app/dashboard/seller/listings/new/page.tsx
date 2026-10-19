import { redirect } from "next/navigation";
import { getSellerContext } from "@/lib/business/context";
import { WizardPage } from "../_wizard-page";

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ commodity?: string }> }) {
  const { commodity } = await searchParams;
  const nextPath = `/dashboard/seller/listings/new${commodity ? `?commodity=${encodeURIComponent(commodity)}` : ""}`;
  const { business, t } = await getSellerContext(nextPath);
  if (!business) redirect(`/dashboard/seller/business?next=${encodeURIComponent(nextPath)}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("listing.create.title")}</h1>
      <WizardPage mode="create" commoditySlug={commodity ?? null} business={business} />
    </div>
  );
}
