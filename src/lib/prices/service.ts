import "server-only";
import { and, eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { marketPrices, priceHistory, priceSources, units } from "@/db/schema";
import { audit } from "@/lib/audit";
import { fieldErrorsFromZod, positiveDecimal, uuidSchema } from "@/lib/validation/common";

const optionalText = (max: number) => z.string().nullish().transform((v) => (v ? v.trim().slice(0, max) : null));
const optionalDecimal = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  })
  .refine((n) => n === null || !Number.isNaN(n), "invalid_number");

export class PriceError extends Error {
  constructor(public code: string, message?: string, public fieldErrors?: Record<string, string>) {
    super(message ?? code);
  }
}

export const PRICE_TYPES = ["indicative", "supplier_offer", "buyer_reported", "official_reference"] as const;
export type PriceStatus = (typeof marketPrices.$inferSelect)["status"];

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");
const optionalUuidNull = z.union([uuidSchema, z.literal("")]).nullish().transform((v) => (v ? v : null));

export const priceInputSchema = z
  .object({
    commodityId: uuidSchema,
    varietyId: optionalUuidNull,
    gradeId: optionalUuidNull,
    locationId: uuidSchema,
    amount: positiveDecimal,
    currency: z.string().trim().min(3).max(3).default("PKR"),
    unitId: uuidSchema,
    priceType: z.enum(PRICE_TYPES).default("indicative"),
    lowAmount: optionalDecimal,
    highAmount: optionalDecimal,
    observationDate: dateStr,
    validUntil: z.string().trim().nullish().transform((v) => (v ? v : null)),
    sourceId: optionalUuidNull,
    sourceReference: optionalText(500),
    notes: optionalText(2000),
  })
  .superRefine((d, ctx) => {
    if (d.observationDate > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["observationDate"], message: "future_date" });
    if (d.lowAmount !== null && d.highAmount !== null && d.lowAmount > d.highAmount) ctx.addIssue({ code: "custom", path: ["lowAmount"], message: "low_gt_high" });
    if (d.lowAmount !== null && d.lowAmount > d.amount) ctx.addIssue({ code: "custom", path: ["lowAmount"], message: "low_gt_amount" });
    if (d.highAmount !== null && d.highAmount < d.amount) ctx.addIssue({ code: "custom", path: ["highAmount"], message: "high_lt_amount" });
    if (d.validUntil && Number.isNaN(new Date(d.validUntil).getTime())) ctx.addIssue({ code: "custom", path: ["validUntil"], message: "invalid_date" });
  });
export type PriceInput = z.input<typeof priceInputSchema>;
type ParsedInput = z.output<typeof priceInputSchema>;

type PriceRow = typeof marketPrices.$inferSelect;

const SNAPSHOT_FIELDS: Array<keyof PriceRow> = [
  "commodityId", "varietyId", "gradeId", "locationId", "amount", "currency", "unitId", "priceType", "lowAmount", "highAmount",
  "previousPriceId", "previousAmount", "changePercent", "observationDate", "publishedAt", "validUntil", "sourceId", "sourceReference", "notes", "status",
];

function snapshot(row: PriceRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of SNAPSHOT_FIELDS) {
    const v = row[f];
    out[f] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

function diff(before: PriceRow, after: PriceRow): string[] {
  return SNAPSHOT_FIELDS.filter((f) => String(before[f] ?? "") !== String(after[f] ?? ""));
}

/** Append a history row with the next version number. */
export async function recordHistory(tx: Tx, row: PriceRow, action: string, actorId: string | null, changedFields: string[] = [], reason?: string | null) {
  const [{ v }] = await tx.select({ v: max(priceHistory.version) }).from(priceHistory).where(eq(priceHistory.priceId, row.id));
  await tx.insert(priceHistory).values({ priceId: row.id, version: (v ?? 0) + 1, action, snapshot: snapshot(row), changedFields, actorId, reason: reason ?? null });
}

function toValues(d: ParsedInput): Omit<typeof marketPrices.$inferInsert, "status"> {
  return {
    commodityId: d.commodityId,
    varietyId: d.varietyId,
    gradeId: d.gradeId,
    locationId: d.locationId,
    amount: d.amount.toFixed(2),
    currency: d.currency,
    unitId: d.unitId,
    priceType: d.priceType,
    lowAmount: d.lowAmount === null ? null : d.lowAmount.toFixed(2),
    highAmount: d.highAmount === null ? null : d.highAmount.toFixed(2),
    observationDate: d.observationDate,
    validUntil: d.validUntil ? new Date(d.validUntil) : null,
    sourceId: d.sourceId,
    sourceReference: d.sourceReference,
    notes: d.notes,
  };
}

export function parsePriceInput(input: PriceInput): ParsedInput {
  const parsed = priceInputSchema.safeParse(input);
  if (!parsed.success) throw new PriceError("validation", "Validation failed", fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

export async function createPrice(input: PriceInput, actorId: string, opts?: { status?: "draft" | "pending_review"; importJobId?: string | null; tx?: Tx }): Promise<PriceRow> {
  const d = parsePriceInput(input);
  const run = async (tx: Tx) => {
    const [unit] = await tx.select().from(units).where(eq(units.id, d.unitId));
    if (!unit) throw new PriceError("validation", "Unknown unit", { unitId: "unknown_unit" });
    const [row] = await tx
      .insert(marketPrices)
      .values({ ...toValues(d), status: opts?.status ?? "draft", createdBy: actorId, importJobId: opts?.importJobId ?? null })
      .returning();
    await recordHistory(tx, row, "created", actorId);
    await audit({ actorId, action: "price.create", entityType: "market_price", entityId: row.id, after: snapshot(row) }, tx);
    return row;
  };
  return opts?.tx ? run(opts.tx) : db.transaction(run);
}

/**
 * Update a price. Draft/pending rows are edited in place. Editing a published row is a
 * "correction": it requires a reason and keeps the row published with full history.
 */
export async function updatePrice(id: string, input: PriceInput, actorId: string, reason?: string | null): Promise<PriceRow> {
  const d = parsePriceInput(input);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(marketPrices).where(eq(marketPrices.id, id)).for("update");
    if (!before) throw new PriceError("not_found");
    if (!["draft", "pending_review", "published"].includes(before.status)) throw new PriceError("invalid_status", `Cannot edit a ${before.status} price`);
    const isCorrection = before.status === "published";
    if (isCorrection && !reason?.trim()) throw new PriceError("reason_required", "A reason is required when correcting a published price");
    if (isCorrection) {
      // A published row's key is protected by the unique index; the key cannot change on correction.
      const keyChanged = ["commodityId", "varietyId", "gradeId", "locationId", "unitId", "priceType"].some((k) => String(before[k as keyof PriceRow] ?? "") !== String((toValues(d) as Record<string, unknown>)[k] ?? ""));
      if (keyChanged) throw new PriceError("key_locked", "Commodity, variety, grade, location, unit and price type cannot change on a published price. Expire it and create a new record.");
    }
    const [after] = await tx.update(marketPrices).set(toValues(d)).where(eq(marketPrices.id, id)).returning();
    const changed = diff(before, after);
    await recordHistory(tx, after, isCorrection ? "corrected" : "updated", actorId, changed, reason);
    await audit({ actorId, action: isCorrection ? "price.correct" : "price.update", entityType: "market_price", entityId: id, before: snapshot(before), after: snapshot(after), reason }, tx);
    return after;
  });
}

/** Publish: validates, supersedes the previous published record for the same key, computes change %. */
export async function publishPrice(id: string, actorId: string, tx?: Tx): Promise<PriceRow> {
  const run = async (t: Tx) => {
    const [row] = await t.select().from(marketPrices).where(eq(marketPrices.id, id)).for("update");
    if (!row) throw new PriceError("not_found");
    if (row.status === "published") return row;
    if (!["draft", "pending_review"].includes(row.status)) throw new PriceError("invalid_status", `Cannot publish a ${row.status} price`);
    const errors: Record<string, string> = {};
    if (!row.unitId) errors.unitId = "required";
    if (!row.observationDate) errors.observationDate = "required";
    else if (row.observationDate > new Date().toISOString().slice(0, 10)) errors.observationDate = "future_date";
    if (!(Number(row.amount) > 0)) errors.amount = "must_be_positive";
    if (!row.sourceId) errors.sourceId = "source_required";
    if (row.validUntil && row.validUntil.getTime() <= Date.now()) errors.validUntil = "already_past";
    if (Object.keys(errors).length) throw new PriceError("validation", "Price cannot be published", errors);

    const nullUuid = "00000000-0000-0000-0000-000000000000";
    const prevRows = await t
      .select()
      .from(marketPrices)
      .where(
        and(
          eq(marketPrices.status, "published"),
          eq(marketPrices.commodityId, row.commodityId),
          sql`coalesce(${marketPrices.varietyId}, ${nullUuid}::uuid) = coalesce(${row.varietyId}::uuid, ${nullUuid}::uuid)`,
          sql`coalesce(${marketPrices.gradeId}, ${nullUuid}::uuid) = coalesce(${row.gradeId}::uuid, ${nullUuid}::uuid)`,
          eq(marketPrices.locationId, row.locationId),
          eq(marketPrices.unitId, row.unitId),
          eq(marketPrices.priceType, row.priceType),
        ),
      )
      .for("update");
    const prev = prevRows[0] ?? null;
    if (prev && prev.observationDate > row.observationDate) {
      throw new PriceError("older_than_published", `A newer rate (observed ${prev.observationDate}) is already published for this key.`);
    }
    if (prev) {
      const [sup] = await t.update(marketPrices).set({ status: "superseded" }).where(eq(marketPrices.id, prev.id)).returning();
      await recordHistory(t, sup, "superseded", actorId, ["status"], `Superseded by ${row.id}`);
    }
    const prevAmount = prev ? Number(prev.amount) : null;
    const changePercent = prevAmount && prevAmount > 0 ? (((Number(row.amount) - prevAmount) / prevAmount) * 100).toFixed(2) : null;
    const [after] = await t
      .update(marketPrices)
      .set({
        status: "published",
        publishedAt: new Date(),
        reviewerId: actorId,
        reviewedAt: new Date(),
        previousPriceId: prev?.id ?? null,
        previousAmount: prev?.amount ?? null,
        changePercent,
      })
      .where(eq(marketPrices.id, id))
      .returning();
    await recordHistory(t, after, "published", actorId, diff(row, after));
    await audit({ actorId, action: "price.publish", entityType: "market_price", entityId: id, before: snapshot(row), after: snapshot(after) }, t);
    return after;
  };
  return tx ? run(tx) : db.transaction(run);
}

export async function expirePrice(id: string, actorId: string, reason?: string | null): Promise<PriceRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(marketPrices).where(eq(marketPrices.id, id)).for("update");
    if (!row) throw new PriceError("not_found");
    if (row.status !== "published") throw new PriceError("invalid_status", "Only published prices can be expired");
    const [after] = await tx.update(marketPrices).set({ status: "expired", validUntil: new Date() }).where(eq(marketPrices.id, id)).returning();
    await recordHistory(tx, after, "expired", actorId, ["status", "validUntil"], reason);
    await audit({ actorId, action: "price.expire", entityType: "market_price", entityId: id, before: snapshot(row), after: snapshot(after), reason }, tx);
    return after;
  });
}

export async function rejectPrice(id: string, actorId: string, reason: string): Promise<PriceRow> {
  if (!reason?.trim()) throw new PriceError("reason_required");
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(marketPrices).where(eq(marketPrices.id, id)).for("update");
    if (!row) throw new PriceError("not_found");
    if (!["draft", "pending_review"].includes(row.status)) throw new PriceError("invalid_status", "Only draft or pending prices can be rejected");
    const [after] = await tx.update(marketPrices).set({ status: "rejected", reviewerId: actorId, reviewedAt: new Date(), notes: row.notes ? `${row.notes}\n\nRejected: ${reason}` : `Rejected: ${reason}` }).where(eq(marketPrices.id, id)).returning();
    await recordHistory(tx, after, "rejected", actorId, ["status"], reason);
    await audit({ actorId, action: "price.reject", entityType: "market_price", entityId: id, before: snapshot(row), after: snapshot(after), reason }, tx);
    return after;
  });
}

export async function scheduleExpiry(id: string, validUntil: Date, actorId: string): Promise<PriceRow> {
  if (validUntil.getTime() <= Date.now()) throw new PriceError("validation", "Expiry must be in the future", { validUntil: "must_be_future" });
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(marketPrices).where(eq(marketPrices.id, id)).for("update");
    if (!row) throw new PriceError("not_found");
    const [after] = await tx.update(marketPrices).set({ validUntil }).where(eq(marketPrices.id, id)).returning();
    await recordHistory(tx, after, "updated", actorId, ["validUntil"], "Scheduled expiry");
    await audit({ actorId, action: "price.update", entityType: "market_price", entityId: id, before: snapshot(row), after: snapshot(after), reason: "schedule_expiry" }, tx);
    return after;
  });
}

export async function submitForReview(id: string, actorId: string): Promise<PriceRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(marketPrices).where(and(eq(marketPrices.id, id), eq(marketPrices.status, "draft"))).for("update");
    if (!row) throw new PriceError("not_found");
    const [after] = await tx.update(marketPrices).set({ status: "pending_review" }).where(eq(marketPrices.id, id)).returning();
    await recordHistory(tx, after, "updated", actorId, ["status"]);
    await audit({ actorId, action: "price.update", entityType: "market_price", entityId: id, before: snapshot(row), after: snapshot(after), reason: "submit_for_review" }, tx);
    return after;
  });
}

/* ---------- Sources ---------- */
export const sourceSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sourceType: z.enum(["market_committee", "government", "exchange", "trade_association", "supplier", "buyer_report", "platform_survey", "other"]).default("other"),
  url: z.union([z.string().trim().url().max(500), z.literal("")]).nullish().transform((v) => (v ? v : null)),
  reference: optionalText(500),
  isActive: z.boolean().default(true),
});
export type SourceInput = z.input<typeof sourceSchema>;

export async function upsertSource(input: SourceInput, actorId: string, id?: string | null) {
  const parsed = sourceSchema.safeParse(input);
  if (!parsed.success) throw new PriceError("validation", "Validation failed", fieldErrorsFromZod(parsed.error));
  const d = parsed.data;
  const values = { name: d.name, sourceType: d.sourceType, url: d.url, reference: d.reference, isActive: d.isActive ? 1 : 0 };
  return db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(priceSources).where(eq(priceSources.id, id));
      if (!before) throw new PriceError("not_found");
      const [after] = await tx.update(priceSources).set(values).where(eq(priceSources.id, id)).returning();
      await audit({ actorId, action: "price_source.update", entityType: "price_source", entityId: id, before, after }, tx);
      return after;
    }
    const [after] = await tx.insert(priceSources).values(values).returning();
    await audit({ actorId, action: "price_source.create", entityType: "price_source", entityId: after.id, after }, tx);
    return after;
  });
}

/** Find or create a source by name (used by CSV import). */
export async function findOrCreateSourceByName(tx: Tx, name: string, actorId: string) {
  const trimmed = name.trim();
  const [existing] = await tx.select().from(priceSources).where(sql`lower(${priceSources.name}) = lower(${trimmed})`).limit(1);
  if (existing) return existing;
  const [created] = await tx.insert(priceSources).values({ name: trimmed, sourceType: "other" }).returning();
  await audit({ actorId, action: "price_source.create", entityType: "price_source", entityId: created.id, after: created, reason: "csv_import" }, tx);
  return created;
}

