import "server-only";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { businesses, listingReports, listings, profiles, rfqs, supportCases } from "@/db/schema";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

type CaseStatus = (typeof supportCases.status.enumValues)[number];
type CaseType = (typeof supportCases.caseType.enumValues)[number];
type Severity = (typeof supportCases.severity.enumValues)[number];

export async function listCases(f: { status?: string; type?: string; severity?: string; assigned?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.status === "open_all") conds.push(inArray(supportCases.status, ["open", "in_progress", "waiting_on_user"]));
  else if (f.status) conds.push(eq(supportCases.status, f.status as CaseStatus));
  if (f.type) conds.push(eq(supportCases.caseType, f.type as CaseType));
  if (f.severity) conds.push(eq(supportCases.severity, f.severity as Severity));
  if (f.assigned) conds.push(eq(supportCases.assignedTo, f.assigned));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(supportCases).where(where);
  const rows = await db
    .select({ c: supportCases, assignee: profiles })
    .from(supportCases)
    .leftJoin(profiles, eq(profiles.id, supportCases.assignedTo))
    .where(where)
    .orderBy(desc(inArray(supportCases.status, ["open", "in_progress", "waiting_on_user"])), desc(supportCases.severity), desc(supportCases.createdAt))
    .limit(pageSize)
    .offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function listListingReports(f: { status?: string; page: number }) {
  const pageSize = 25;
  const conds: SQL[] = [];
  if (f.status === "open_all") conds.push(inArray(listingReports.status, ["open", "under_review"]));
  else if (f.status) conds.push(eq(listingReports.status, f.status as (typeof listingReports.status.enumValues)[number]));
  const where = conds.length ? and(...conds) : undefined;
  const [{ n: total }] = await db.select({ n: count() }).from(listingReports).where(where);
  const rows = await db
    .select({ r: listingReports, listing: listings, biz: businesses, reporter: profiles })
    .from(listingReports)
    .leftJoin(listings, eq(listings.id, listingReports.listingId))
    .leftJoin(businesses, eq(businesses.id, listingReports.businessId))
    .leftJoin(profiles, eq(profiles.id, listingReports.reporterId))
    .where(where)
    .orderBy(desc(listingReports.createdAt))
    .limit(pageSize)
    .offset((f.page - 1) * pageSize);
  return { rows, total: Number(total), page: f.page, totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getCaseDetail(id: string) {
  const [row] = await db.select({ c: supportCases, assignee: profiles }).from(supportCases).leftJoin(profiles, eq(profiles.id, supportCases.assignedTo)).where(eq(supportCases.id, id)).limit(1);
  if (!row) return null;
  const reporter = row.c.reporterId ? (await db.select({ id: profiles.id, name: profiles.name, phone: profiles.phone }).from(profiles).where(eq(profiles.id, row.c.reporterId)))[0] ?? null : null;
  let linked: { kind: "listing" | "business" | "rfq" | "user"; label: string; href: string; adminHref: string } | null = null;
  if (row.c.entityType && row.c.entityId) {
    if (row.c.entityType === "listing") {
      const [l] = await db.select({ slug: listings.slug, title: listings.title, status: listings.status }).from(listings).where(eq(listings.id, row.c.entityId));
      if (l) linked = { kind: "listing", label: `${l.title} (${l.status})`, href: `/listings/${l.slug}`, adminHref: `/admin/listings/${row.c.entityId}` };
    } else if (row.c.entityType === "business") {
      const [b] = await db.select({ slug: businesses.slug, name: businesses.name, status: businesses.status }).from(businesses).where(eq(businesses.id, row.c.entityId));
      if (b) linked = { kind: "business", label: `${b.name} (${b.status})`, href: `/supplier/${b.slug}`, adminHref: `/admin/businesses/${row.c.entityId}` };
    } else if (row.c.entityType === "rfq") {
      const [r] = await db.select({ reference: rfqs.reference, status: rfqs.status }).from(rfqs).where(eq(rfqs.id, row.c.entityId));
      if (r) linked = { kind: "rfq", label: `${r.reference} (${r.status})`, href: `/admin/enquiries/${row.c.entityId}`, adminHref: `/admin/enquiries/${row.c.entityId}` };
    } else if (row.c.entityType === "user") {
      const [u] = await db.select({ name: profiles.name, status: profiles.status }).from(profiles).where(eq(profiles.id, row.c.entityId));
      if (u) linked = { kind: "user", label: `${u.name} (${u.status})`, href: `/admin/users/${row.c.entityId}`, adminHref: `/admin/users/${row.c.entityId}` };
    }
  }
  return { ...row, reporter, linked };
}

export async function assignCase(actorId: string, id: string, assignedTo: string | null) {
  await db.transaction(async (tx) => {
    const [c] = await tx.select({ assignedTo: supportCases.assignedTo, status: supportCases.status }).from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new Error("Not found");
    await tx.update(supportCases).set({ assignedTo, status: c.status === "open" && assignedTo ? "in_progress" : c.status }).where(eq(supportCases.id, id));
    await audit({ actorId, action: "case.assign", entityType: "support_case", entityId: id, before: { assignedTo: c.assignedTo }, after: { assignedTo } }, tx);
  });
}

export async function setCaseSeverity(actorId: string, id: string, severity: Severity) {
  await db.transaction(async (tx) => {
    const [c] = await tx.select({ severity: supportCases.severity }).from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new Error("Not found");
    await tx.update(supportCases).set({ severity }).where(eq(supportCases.id, id));
    await audit({ actorId, action: "case.severity", entityType: "support_case", entityId: id, before: { severity: c.severity }, after: { severity } }, tx);
  });
}

export async function addCaseNote(actorId: string, id: string, text: string) {
  if (!text.trim()) throw new Error("Note is required");
  await db.transaction(async (tx) => {
    const [c] = await tx.select({ notes: supportCases.notes }).from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new Error("Not found");
    const notes = [...(c.notes ?? []), { at: new Date().toISOString(), by: actorId, text: text.trim().slice(0, 2000) }];
    await tx.update(supportCases).set({ notes }).where(eq(supportCases.id, id));
    await audit({ actorId, action: "case.note", entityType: "support_case", entityId: id, after: { noteLength: text.length } }, tx);
  });
}

export async function setCaseStatus(actorId: string, id: string, status: CaseStatus, resolution: string) {
  const closing = status === "resolved" || status === "dismissed";
  if (closing && !resolution.trim()) throw new Error("Resolution text is required");
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new Error("Not found");
    await tx.update(supportCases).set({ status, resolution: closing ? resolution : c.resolution, resolvedAt: closing ? new Date() : null }).where(eq(supportCases.id, id));
    await audit({ actorId, action: "case.status", entityType: "support_case", entityId: id, before: { status: c.status }, after: { status }, reason: resolution || null }, tx);
    if (closing && c.reporterId) {
      await notify({ userId: c.reporterId, type: "report_resolved", title: `Your report ${c.reference} was ${status}`, body: resolution, linkPath: "/notifications", entityType: "support_case", entityId: id }, tx);
    }
  });
}

export async function resolveListingReport(actorId: string, id: string, status: "resolved" | "dismissed" | "under_review", resolution: string) {
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(listingReports).where(eq(listingReports.id, id));
    if (!r) throw new Error("Not found");
    await tx.update(listingReports).set({ status, reviewerId: actorId, resolution: resolution || null, resolvedAt: status === "under_review" ? null : new Date() }).where(eq(listingReports.id, id));
    await audit({ actorId, action: "listing_report." + status, entityType: "listing_report", entityId: id, before: { status: r.status }, after: { status }, reason: resolution || null }, tx);
    if (status !== "under_review" && r.reporterId) {
      await notify({ userId: r.reporterId, type: "report_resolved", title: `Your report was ${status}`, body: resolution || undefined, linkPath: r.listingId ? undefined : "/notifications", entityType: "listing_report", entityId: id }, tx);
    }
  });
}

export const CASE_STATUSES: CaseStatus[] = ["open", "in_progress", "waiting_on_user", "resolved", "dismissed"];
export const CASE_TYPES: CaseType[] = ["listing_report", "supplier_report", "spam", "misleading_price", "fraud", "prohibited_goods", "privacy", "support", "data_deletion", "other"];
export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
