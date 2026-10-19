import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { AdminPageHeader } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { PriceForm } from "@/components/admin/prices/price-form";
import { locationGroupsForForm, sourceOptions } from "@/components/admin/prices/shared";
import { PRICE_TYPES } from "@/lib/prices/service";
import { getPriceById } from "@/lib/prices/queries";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditPricePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("prices.edit");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await getPriceById(id);
  if (!row) notFound();
  const editable = ["draft", "pending_review", "published"].includes(row.p.status);
  const [locations, sources] = await Promise.all([locationGroupsForForm(), sourceOptions()]);
  return (
    <div>
      <AdminPageHeader title={`Edit price: ${row.commodity.nameEn} — ${row.loc.nameEn}`} breadcrumbs={[{ label: "Market prices", href: "/admin/prices" }, { label: row.commodity.nameEn, href: `/admin/prices/${id}` }, { label: "Edit" }]} />
      {!editable ? (
        <Alert tone="warning">This record is {row.p.status.replace("_", " ")} and can no longer be edited. Create a new record instead.</Alert>
      ) : (
        <PriceForm
          initial={{
            id: row.p.id,
            status: row.p.status,
            commodityId: row.commodity.id,
            commodityName: row.commodity.nameEn,
            varietyId: row.p.varietyId,
            gradeId: row.p.gradeId,
            locationId: row.p.locationId,
            amount: row.p.amount,
            unitId: row.p.unitId,
            priceType: row.p.priceType,
            lowAmount: row.p.lowAmount,
            highAmount: row.p.highAmount,
            observationDate: row.p.observationDate,
            validUntil: toLocalInput(row.p.validUntil),
            sourceId: row.p.sourceId,
            sourceReference: row.p.sourceReference,
            notes: row.p.notes,
          }}
          locations={locations}
          sources={sources}
          priceTypes={[...PRICE_TYPES]}
          canPublish={hasPermission(user.roles, "prices.publish")}
        />
      )}
    </div>
  );
}
