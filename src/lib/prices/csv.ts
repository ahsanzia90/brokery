import "server-only";
import { parse } from "csv-parse/sync";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { commodities, commodityAliases, commodityGrades, commodityVarieties, locations, priceImportJobs, units } from "@/db/schema";
import { audit } from "@/lib/audit";
import { normalizeText } from "@/lib/utils/text";
import { createPrice, findOrCreateSourceByName, PRICE_TYPES, PriceError, publishPrice } from "./service";

export const CSV_COLUMNS = ["commodity", "variety", "grade", "location", "amount", "unit", "price_type", "observation_date", "source", "low", "high", "notes", "valid_until"] as const;

export function csvTemplate(): string {
  return [
    "# Lines starting with # are ignored. Required: commodity, location, amount, unit, observation_date (YYYY-MM-DD), source.",
    "# commodity/variety/grade/location/unit accept slugs, English names or known aliases. price_type: indicative | supplier_offer | buyer_reported | official_reference.",
    CSV_COLUMNS.join(","),
  ].join("\n") + "\n";
}

type RowError = { row: number; message: string };

export async function importPricesCsv(opts: { actorId: string; filename: string; csvText: string; publish: boolean }): Promise<{ jobId: string; status: string; total: number; imported: number; failed: number; errors: RowError[] }> {
  const [job] = await db.insert(priceImportJobs).values({ filename: opts.filename.slice(0, 200), status: "processing", actorId: opts.actorId }).returning();
  const errors: RowError[] = [];
  let records: Record<string, string>[] = [];
  try {
    records = parse(opts.csvText, { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, comment: "#", relax_column_count: true, bom: true }) as Record<string, string>[];
  } catch (e) {
    await db.update(priceImportJobs).set({ status: "failed", errors: [{ row: 0, message: `CSV parse error: ${(e as Error).message}` }] }).where(eq(priceImportJobs.id, job.id));
    return { jobId: job.id, status: "failed", total: 0, imported: 0, failed: 0, errors: [{ row: 0, message: `CSV parse error: ${(e as Error).message}` }] };
  }

  const today = new Date().toISOString().slice(0, 10);
  let imported = 0;
  const unitRows = await db.select().from(units);
  const unitByKey = new Map<string, string>();
  for (const u of unitRows) {
    unitByKey.set(u.code.toLowerCase(), u.id);
    unitByKey.set(u.symbol.toLowerCase(), u.id);
    unitByKey.set(normalizeText(u.nameEn), u.id);
  }

  async function resolveCommodity(raw: string): Promise<string | null> {
    const norm = normalizeText(raw);
    if (!norm) return null;
    const [bySlug] = await db.select({ id: commodities.id }).from(commodities).where(and(eq(commodities.status, "active"), sql`${commodities.slug} = ${raw.trim().toLowerCase()} OR lower(${commodities.nameEn}) = ${norm}`)).limit(1);
    if (bySlug) return bySlug.id;
    const [byAlias] = await db.select({ id: commodityAliases.commodityId }).from(commodityAliases).where(eq(commodityAliases.normalized, norm)).limit(1);
    return byAlias?.id ?? null;
  }
  async function resolveVariety(commodityId: string, raw: string): Promise<string | null> {
    const norm = normalizeText(raw);
    const [row] = await db
      .select({ id: commodityVarieties.id })
      .from(commodityVarieties)
      .where(and(eq(commodityVarieties.commodityId, commodityId), sql`${commodityVarieties.slug} = ${raw.trim().toLowerCase()} OR lower(${commodityVarieties.nameEn}) = ${norm} OR EXISTS (SELECT 1 FROM unnest(${commodityVarieties.aliasesRoman}) a WHERE lower(a) = ${norm})`))
      .limit(1);
    return row?.id ?? null;
  }
  async function resolveGrade(commodityId: string, raw: string): Promise<string | null> {
    const norm = normalizeText(raw);
    const [row] = await db.select({ id: commodityGrades.id }).from(commodityGrades).where(and(eq(commodityGrades.commodityId, commodityId), sql`${commodityGrades.slug} = ${raw.trim().toLowerCase()} OR lower(${commodityGrades.nameEn}) = ${norm}`)).limit(1);
    return row?.id ?? null;
  }
  async function resolveLocation(raw: string): Promise<string | null> {
    const norm = normalizeText(raw);
    const rows = await db
      .select({ id: locations.id, type: locations.type })
      .from(locations)
      .where(and(inArray(locations.type, ["city", "market"]), sql`${locations.slug} = ${raw.trim().toLowerCase()} OR lower(${locations.nameEn}) = ${norm} OR EXISTS (SELECT 1 FROM unnest(${locations.aliasesRoman}) a WHERE lower(a) = ${norm})`))
      .limit(2);
    return rows.find((r) => r.type === "city")?.id ?? rows[0]?.id ?? null;
  }

  for (let i = 0; i < records.length; i++) {
    const rowNo = i + 2; // header is row 1
    const r = records[i];
    const get = (k: string) => (r[k] ?? "").trim();
    try {
      const missing = ["commodity", "location", "amount", "unit", "observation_date", "source"].filter((k) => !get(k));
      if (missing.length) throw new Error(`Missing required column(s): ${missing.join(", ")}`);
      const commodityId = await resolveCommodity(get("commodity"));
      if (!commodityId) throw new Error(`Unknown commodity "${get("commodity")}"`);
      const varietyId = get("variety") ? await resolveVariety(commodityId, get("variety")) : null;
      if (get("variety") && !varietyId) throw new Error(`Unknown variety "${get("variety")}" for this commodity`);
      const gradeId = get("grade") ? await resolveGrade(commodityId, get("grade")) : null;
      if (get("grade") && !gradeId) throw new Error(`Unknown grade "${get("grade")}" for this commodity`);
      const locationId = await resolveLocation(get("location"));
      if (!locationId) throw new Error(`Unknown location "${get("location")}"`);
      const unitId = unitByKey.get(get("unit").toLowerCase()) ?? unitByKey.get(normalizeText(get("unit")));
      if (!unitId) throw new Error(`Unknown unit "${get("unit")}"`);
      const priceType = (get("price_type") || "indicative").toLowerCase();
      if (!(PRICE_TYPES as readonly string[]).includes(priceType)) throw new Error(`Invalid price_type "${get("price_type")}"`);
      const observationDate = get("observation_date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || Number.isNaN(new Date(observationDate).getTime())) throw new Error(`Invalid observation_date "${observationDate}" (use YYYY-MM-DD)`);
      if (observationDate > today) throw new Error("observation_date is in the future");

      const createdId = await db.transaction(async (tx) => {
        const source = await findOrCreateSourceByName(tx, get("source"), opts.actorId);
        const row = await createPrice(
          {
            commodityId,
            varietyId,
            gradeId,
            locationId,
            amount: get("amount"),
            unitId,
            priceType: priceType as (typeof PRICE_TYPES)[number],
            lowAmount: get("low") || null,
            highAmount: get("high") || null,
            observationDate,
            validUntil: get("valid_until") || null,
            sourceId: source.id,
            sourceReference: null,
            notes: get("notes") || null,
          },
          opts.actorId,
          { status: "pending_review", importJobId: job.id, tx },
        );
        if (opts.publish) await publishPrice(row.id, opts.actorId, tx);
        return row.id;
      });
      if (createdId) imported++;
    } catch (e) {
      const msg = e instanceof PriceError ? `${e.message}${e.fieldErrors ? " (" + Object.entries(e.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(", ") + ")" : ""}` : (e as Error).message;
      errors.push({ row: rowNo, message: msg });
    }
  }

  const failed = errors.length;
  const status = records.length === 0 ? "failed" : failed === 0 ? "completed" : imported === 0 ? "failed" : "partial";
  if (records.length === 0) errors.push({ row: 0, message: "No data rows found" });
  await db.update(priceImportJobs).set({ status, totalRows: records.length, importedRows: imported, failedRows: failed, errors }).where(eq(priceImportJobs.id, job.id));
  await audit({ actorId: opts.actorId, action: "price.import", entityType: "price_import_job", entityId: job.id, after: { filename: opts.filename, status, total: records.length, imported, failed, publish: opts.publish } });
  return { jobId: job.id, status, total: records.length, imported, failed, errors };
}

export async function listImportJobs(limit = 20) {
  return db.select().from(priceImportJobs).orderBy(sql`${priceImportJobs.createdAt} desc`).limit(limit);
}
