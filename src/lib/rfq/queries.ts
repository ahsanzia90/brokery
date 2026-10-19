import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefinitions,
  businesses,
  commodities,
  commodityGrades,
  commodityVarieties,
  enquiryEvents,
  listings,
  locations,
  rfqAttributes,
  rfqRecipients,
  rfqs,
  supplierQuotes,
  units,
} from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { OPEN_RFQ_STATUSES } from "./service";

const name = (locale: Locale, row: { nameEn: string; nameUr: string | null } | null | undefined) => (row ? (locale === "ur" && row.nameUr ? row.nameUr : row.nameEn) : "");

export type RfqListItem = {
  id: string;
  reference: string;
  status: string;
  commodityName: string;
  commoditySlug: string;
  varietyName: string | null;
  quantity: string;
  unitSymbol: string;
  cityName: string | null;
  quoteCount: number;
  recipientCount: number;
  createdAt: Date;
  requiredBy: string | null;
};

export async function getBuyerRfqs(buyerId: string, opts: { status?: "all" | "open" | "closed"; page?: number; pageSize?: number } = {}, locale: Locale = "en") {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 10);
  const statusFilter =
    opts.status === "open" ? inArray(rfqs.status, [...OPEN_RFQ_STATUSES]) : opts.status === "closed" ? inArray(rfqs.status, ["closed", "cancelled"]) : undefined;
  const where = and(eq(rfqs.buyerId, buyerId), statusFilter);
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(rfqs).where(where),
    db
      .select({
        r: rfqs,
        commodity: commodities,
        variety: commodityVarieties,
        unit: units,
        city: locations,
        quoteCount: sql<number>`(SELECT count(*) FROM supplier_quotes q WHERE q.rfq_id = ${rfqs.id} AND q.status <> 'withdrawn')`,
        recipientCount: sql<number>`(SELECT count(*) FROM rfq_recipients rr WHERE rr.rfq_id = ${rfqs.id})`,
      })
      .from(rfqs)
      .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
      .leftJoin(commodityVarieties, eq(commodityVarieties.id, rfqs.varietyId))
      .innerJoin(units, eq(units.id, rfqs.unitId))
      .leftJoin(locations, eq(locations.id, rfqs.cityId))
      .where(where)
      .orderBy(desc(rfqs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  const items: RfqListItem[] = rows.map((x) => ({
    id: x.r.id,
    reference: x.r.reference,
    status: x.r.status,
    commodityName: name(locale, x.commodity),
    commoditySlug: x.commodity.slug,
    varietyName: x.variety ? name(locale, x.variety) : x.r.customSpecification,
    quantity: x.r.quantity,
    unitSymbol: x.unit.symbol,
    cityName: x.city ? name(locale, x.city) : null,
    quoteCount: Number(x.quoteCount),
    recipientCount: Number(x.recipientCount),
    createdAt: x.r.createdAt,
    requiredBy: x.r.requiredBy,
  }));
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBuyerRfqStats(buyerId: string) {
  const [open] = await db.select({ n: count() }).from(rfqs).where(and(eq(rfqs.buyerId, buyerId), inArray(rfqs.status, [...OPEN_RFQ_STATUSES])));
  const [offers] = await db
    .select({ n: count() })
    .from(supplierQuotes)
    .innerJoin(rfqs, eq(rfqs.id, supplierQuotes.rfqId))
    .where(and(eq(rfqs.buyerId, buyerId), sql`${supplierQuotes.status} <> 'withdrawn'`));
  const [newOffers] = await db
    .select({ n: count() })
    .from(supplierQuotes)
    .innerJoin(rfqs, eq(rfqs.id, supplierQuotes.rfqId))
    .where(and(eq(rfqs.buyerId, buyerId), eq(supplierQuotes.status, "sent")));
  return { openRequests: open?.n ?? 0, offersReceived: offers?.n ?? 0, newOffers: newOffers?.n ?? 0 };
}

export type RfqQuote = {
  id: string;
  status: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  verificationLevel: string;
  cityName: string | null;
  priceAmount: string | null;
  priceUnitSymbol: string | null;
  priceUnitId: string | null;
  quantity: string | null;
  quantityUnitSymbol: string | null;
  validUntil: string | null;
  deliveryTerms: string | null;
  notes: string | null;
  createdAt: Date;
  /** Contact details only if the business consented to show them publicly. */
  phone: string | null;
  whatsapp: string | null;
};

export type RfqDetail = {
  id: string;
  reference: string;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  closedReason: string | null;
  commodityName: string;
  commoditySlug: string;
  varietyName: string | null;
  gradeName: string | null;
  customSpecification: string | null;
  quantity: string;
  unitSymbol: string;
  provinceName: string | null;
  cityName: string | null;
  marketName: string | null;
  requiredBy: string | null;
  targetPrice: string | null;
  targetPriceUnitSymbol: string | null;
  qualityRequirements: string | null;
  notes: string | null;
  contactPreference: string;
  listingSlug: string | null;
  targetBusinessName: string | null;
  targetBusinessSlug: string | null;
  attributes: Array<{ name: string; value: string; unitLabel: string | null }>;
  recipientCount: number;
  quotes: RfqQuote[];
  events: Array<{ id: string; eventType: string; createdAt: Date; metadata: Record<string, unknown> | null }>;
};

export async function getRfqForBuyer(rfqId: string, buyerId: string, locale: Locale = "en"): Promise<RfqDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(rfqId)) return null;
  const [row] = await db
    .select({
      r: rfqs,
      commodity: commodities,
      variety: commodityVarieties,
      grade: commodityGrades,
      unit: units,
      targetBiz: businesses,
      listing: listings,
      priceUnit: sql<string | null>`(SELECT symbol FROM units pu WHERE pu.id = ${rfqs.targetPriceUnitId})`,
      provinceName: sql<string | null>`(SELECT ${locale === "ur" ? sql`coalesce(name_ur, name_en)` : sql`name_en`} FROM locations WHERE id = ${rfqs.provinceId})`,
      cityName: sql<string | null>`(SELECT ${locale === "ur" ? sql`coalesce(name_ur, name_en)` : sql`name_en`} FROM locations WHERE id = ${rfqs.cityId})`,
      marketName: sql<string | null>`(SELECT ${locale === "ur" ? sql`coalesce(name_ur, name_en)` : sql`name_en`} FROM locations WHERE id = ${rfqs.marketId})`,
      recipientCount: sql<number>`(SELECT count(*) FROM rfq_recipients rr WHERE rr.rfq_id = ${rfqs.id})`,
    })
    .from(rfqs)
    .innerJoin(commodities, eq(commodities.id, rfqs.commodityId))
    .leftJoin(commodityVarieties, eq(commodityVarieties.id, rfqs.varietyId))
    .leftJoin(commodityGrades, eq(commodityGrades.id, rfqs.gradeId))
    .innerJoin(units, eq(units.id, rfqs.unitId))
    .leftJoin(businesses, eq(businesses.id, rfqs.targetBusinessId))
    .leftJoin(listings, eq(listings.id, rfqs.listingId))
    .where(and(eq(rfqs.id, rfqId), eq(rfqs.buyerId, buyerId)))
    .limit(1);
  if (!row) return null;

  const [attrs, quoteRows, events] = await Promise.all([
    db
      .select({ a: rfqAttributes, def: attributeDefinitions })
      .from(rfqAttributes)
      .innerJoin(attributeDefinitions, eq(attributeDefinitions.id, rfqAttributes.attributeId))
      .where(eq(rfqAttributes.rfqId, rfqId)),
    db
      .select({
        q: supplierQuotes,
        b: businesses,
        cityName: sql<string | null>`(SELECT ${locale === "ur" ? sql`coalesce(name_ur, name_en)` : sql`name_en`} FROM locations WHERE id = ${businesses.cityId})`,
        priceUnitSymbol: sql<string | null>`(SELECT symbol FROM units u WHERE u.id = ${supplierQuotes.priceUnitId})`,
        quantityUnitSymbol: sql<string | null>`(SELECT symbol FROM units u WHERE u.id = ${supplierQuotes.quantityUnitId})`,
      })
      .from(supplierQuotes)
      .innerJoin(businesses, eq(businesses.id, supplierQuotes.businessId))
      .where(and(eq(supplierQuotes.rfqId, rfqId), sql`${supplierQuotes.status} <> 'withdrawn'`))
      .orderBy(asc(supplierQuotes.createdAt)),
    db.select().from(enquiryEvents).where(eq(enquiryEvents.rfqId, rfqId)).orderBy(asc(enquiryEvents.createdAt)).limit(100),
  ]);

  return {
    id: row.r.id,
    reference: row.r.reference,
    status: row.r.status,
    createdAt: row.r.createdAt,
    expiresAt: row.r.expiresAt,
    closedReason: row.r.closedReason,
    commodityName: name(locale, row.commodity),
    commoditySlug: row.commodity.slug,
    varietyName: row.variety ? name(locale, row.variety) : null,
    gradeName: row.grade ? name(locale, row.grade) : null,
    customSpecification: row.r.customSpecification,
    quantity: row.r.quantity,
    unitSymbol: row.unit.symbol,
    provinceName: row.provinceName,
    cityName: row.cityName,
    marketName: row.marketName,
    requiredBy: row.r.requiredBy,
    targetPrice: row.r.targetPrice,
    targetPriceUnitSymbol: row.priceUnit,
    qualityRequirements: row.r.qualityRequirements,
    notes: row.r.notes,
    contactPreference: row.r.contactPreference,
    listingSlug: row.listing?.slug ?? null,
    targetBusinessName: row.targetBiz?.name ?? null,
    targetBusinessSlug: row.targetBiz?.slug ?? null,
    attributes: attrs.map((x) => ({ name: name(locale, x.def), value: x.a.valueText ?? x.a.valueNumber ?? "", unitLabel: x.def.unitLabel })),
    recipientCount: Number(row.recipientCount),
    quotes: quoteRows.map((x) => ({
      id: x.q.id,
      status: x.q.status,
      businessId: x.b.id,
      businessName: x.b.name,
      businessSlug: x.b.slug,
      verificationLevel: x.b.verificationLevel,
      cityName: x.cityName,
      priceAmount: x.q.priceAmount,
      priceUnitSymbol: x.priceUnitSymbol,
      priceUnitId: x.q.priceUnitId,
      quantity: x.q.quantity,
      quantityUnitSymbol: x.quantityUnitSymbol,
      validUntil: x.q.validUntil,
      deliveryTerms: x.q.deliveryTerms,
      notes: x.q.notes,
      createdAt: x.q.createdAt,
      phone: x.b.showPhonePublicly ? x.b.publicPhone : null,
      whatsapp: x.b.showWhatsappPublicly ? x.b.whatsappNumber : null,
    })),
    events: events.map((e) => ({ id: e.id, eventType: e.eventType, createdAt: e.createdAt, metadata: e.metadata ?? null })),
  };
}

/** Lightweight data to prefill the RFQ form from a listing or supplier slug. */
export async function getRfqPrefill(params: { commodity?: string; listing?: string; supplier?: string }) {
  const out: { commodity?: { id: string; slug: string; nameEn: string; nameUr: string | null }; varietyId?: string | null; gradeId?: string | null; cityId?: string | null; provinceId?: string | null; listingSlug?: string; supplier?: { id: string; slug: string; name: string } } = {};
  if (params.listing) {
    const [l] = await db
      .select({ l: listings, c: commodities, b: businesses })
      .from(listings)
      .innerJoin(commodities, eq(commodities.id, listings.commodityId))
      .innerJoin(businesses, eq(businesses.id, listings.businessId))
      .where(and(eq(listings.slug, params.listing), eq(listings.status, "published")))
      .limit(1);
    if (l) {
      out.commodity = { id: l.c.id, slug: l.c.slug, nameEn: l.c.nameEn, nameUr: l.c.nameUr };
      out.varietyId = l.l.varietyId;
      out.gradeId = l.l.gradeId;
      out.cityId = l.l.cityId;
      out.provinceId = l.l.provinceId;
      out.listingSlug = l.l.slug;
      out.supplier = { id: l.b.id, slug: l.b.slug, name: l.b.name };
    }
  }
  if (!out.commodity && params.commodity) {
    const [c] = await db.select().from(commodities).where(and(eq(commodities.slug, params.commodity), eq(commodities.status, "active"))).limit(1);
    if (c) out.commodity = { id: c.id, slug: c.slug, nameEn: c.nameEn, nameUr: c.nameUr };
  }
  if (!out.supplier && params.supplier) {
    const [b] = await db.select({ id: businesses.id, slug: businesses.slug, name: businesses.name }).from(businesses).where(and(eq(businesses.slug, params.supplier), eq(businesses.status, "active"))).limit(1);
    if (b) out.supplier = b;
  }
  return out;
}
