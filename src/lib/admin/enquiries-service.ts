import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { businesses, commodities, enquiryEvents, locations, profiles, rfqRecipients, rfqs, supplierQuotes, supportCases, units } from "@/db/schema";
import { audit } from "@/lib/audit";
import { makeReference } from "@/lib/utils/ids";

type RfqStatus = (typeof rfqs.status.enumValues)[number];

export async function listRfqs(f: { q?: string; status?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(rfqs.status, f.status as RfqStatus));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(or(ilike(rfqs.reference, like), ilike(profiles.name, like), ilike(profiles.phone, like), ilike(commodities.nameEn, like))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(rfqs).innerJoin(profiles, eq(profiles.id, rfqs.buyerId)).innerJoin(commodities, eq(commodities.id, rfqs.commodityId)).where(where);
  const rows = await db
    .select({ r: rfqs, buyer: profiles, commodity: commodities, unit: units, city: locations, recipients: sql<number>`(SELECT count(*) FROM rfq_recipients x WHERE x.rfq_id = ${rfqs.id})`, quotes: sql<number>`(SELECT count(*) FROM supplier_quotes q WHERE q.rfq_id = ${rfqs.id})` })
    .from(rfqs)
    .innerJoin(profiles, eq(profiles.id, rfqs.buyerId))
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .innerJoin(units, eq(units.id, rfqs.unitId))
    .leftJoin(locations, eq(locations.id, rfqs.cityId))
    .where(where)
    .orderBy(desc(rfqs.createdAt))
    .limit(pageSize)
    .offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getRfqDetail(id: string) {
  const [row] = await db
    .select({ r: rfqs, buyer: profiles, commodity: commodities, unit: units, city: locations })
    .from(rfqs)
    .innerJoin(profiles, eq(profiles.id, rfqs.buyerId))
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .innerJoin(units, eq(units.id, rfqs.unitId))
    .leftJoin(locations, eq(locations.id, rfqs.cityId))
    .where(eq(rfqs.id, id))
    .limit(1);
  if (!row) return null;
  const [recipients, quotes, events] = await Promise.all([
    db.select({ rec: rfqRecipients, biz: businesses }).from(rfqRecipients).innerJoin(businesses, eq(businesses.id, rfqRecipients.businessId)).where(eq(rfqRecipients.rfqId, id)).orderBy(desc(rfqRecipients.createdAt)),
    db.select({ q: supplierQuotes, biz: businesses, unit: units }).from(supplierQuotes).innerJoin(businesses, eq(businesses.id, supplierQuotes.businessId)).leftJoin(units, eq(units.id, supplierQuotes.priceUnitId)).where(eq(supplierQuotes.rfqId, id)).orderBy(desc(supplierQuotes.createdAt)),
    db.select({ e: enquiryEvents, actor: profiles }).from(enquiryEvents).leftJoin(profiles, eq(profiles.id, enquiryEvents.actorId)).where(eq(enquiryEvents.rfqId, id)).orderBy(desc(enquiryEvents.createdAt)).limit(100),
  ]);
  return { ...row, recipients, quotes, events };
}

export async function closeRfqAsSpam(actorId: string, id: string, reason: string) {
  if (!reason.trim()) throw new Error("Reason is required");
  let reference = makeReference("CASE");
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(rfqs).where(eq(rfqs.id, id));
    if (!r) throw new Error("Not found");
    await tx.update(rfqs).set({ status: "cancelled", closedReason: `Closed by moderation: ${reason}` }).where(eq(rfqs.id, id));
    await tx.insert(enquiryEvents).values({ rfqId: id, actorId, eventType: "status_changed", metadata: { from: r.status, to: "cancelled", by: "moderation" } });
    for (let i = 0; i < 3; i++) {
      try {
        await tx.insert(supportCases).values({ reference, caseType: "spam", severity: "low", status: "resolved", reporterId: actorId, subject: `RFQ ${r.reference} closed as spam`, description: reason, entityType: "rfq", entityId: id, assignedTo: actorId, resolution: reason, resolvedAt: new Date() });
        break;
      } catch (e) {
        if (!String((e as Error).message).includes("support_cases_reference_uq") || i === 2) throw e;
        reference = makeReference("CASE");
      }
    }
    await audit({ actorId, action: "rfq.close_spam", entityType: "rfq", entityId: id, before: { status: r.status }, after: { status: "cancelled" }, reason }, tx);
  });
}

export const RFQ_STATUSES: RfqStatus[] = ["submitted", "matching", "responses_received", "in_discussion", "closed", "cancelled"];
