// Development smoke test for admin operations services. Run: npx tsx scripts/dev/admin-ops-smoke.ts
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import { and, desc, eq, like } from "drizzle-orm";

async function main() {
  const { db } = await import("../../src/db");
  const s = await import("../../src/db/schema");
  const L = await import("../../src/lib/admin/listings-service");
  const V = await import("../../src/lib/admin/verifications-service");
  const U = await import("../../src/lib/admin/users-service");
  const C = await import("../../src/lib/admin/cases-service");

  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.phone, "+923000000001"));
  const [seller] = await db.select().from(s.profiles).where(eq(s.profiles.phone, "+923000000002"));
  const [biz] = await db.select().from(s.businesses).where(eq(s.businesses.ownerId, seller.id));
  const [sample] = await db.select().from(s.listings).where(eq(s.listings.businessId, biz.id)).limit(1);
  const actor = { id: admin.id, roles: ["super_admin" as const] };
  const assert = (c: unknown, m: string) => { if (!c) throw new Error("ASSERT FAILED: " + m); console.log("ok:", m); };

  // 1. pending listing → approve; another → reject
  const mk = async (title: string) => (await db.insert(s.listings).values({ businessId: biz.id, createdBy: seller.id, commodityId: sample.commodityId, slug: "test-" + Math.random().toString(36).slice(2, 8), title, quantity: "100", unitId: sample.unitId, status: "pending_review" }).returning())[0];
  const a = await mk("[Test] pending to approve");
  const b = await mk("[Test] pending to reject");
  await L.approveListing(admin.id, a.id);
  const [a2] = await db.select().from(s.listings).where(eq(s.listings.id, a.id));
  assert(a2.status === "published" && a2.publishedAt && a2.expiresAt, "approve → published with expiry");
  await L.rejectListing(admin.id, b.id, "Test rejection reason");
  const [b2] = await db.select().from(s.listings).where(eq(s.listings.id, b.id));
  assert(b2.status === "rejected" && b2.statusReason === "Test rejection reason", "reject → rejected with reason");
  let err = "";
  try { await L.rejectListing(admin.id, a.id, ""); } catch (e) { err = (e as Error).message; }
  assert(err.includes("Reason"), "reject without reason fails");
  const hist = await db.select().from(s.listingStatusHistory).where(eq(s.listingStatusHistory.listingId, a.id));
  assert(hist.some((h) => h.newStatus === "published" && h.actorId === admin.id), "status history row written");
  const notif = await db.select().from(s.notifications).where(and(eq(s.notifications.userId, seller.id), eq(s.notifications.type, "listing_approved")));
  assert(notif.length > 0, "seller notified of approval");
  const ref = await L.flagSuspiciousPrice(admin.id, a.id, "price looks 10x too low");
  assert(ref.startsWith("CASE-"), "flag price creates case " + ref);

  // 2. verification request → approve
  const [vr] = await db.insert(s.businessVerifications).values({ businessId: biz.id, requestedLevel: "documents_reviewed", status: "submitted", submittedBy: seller.id }).returning();
  await V.claimVerification(admin.id, vr.id);
  await V.approveVerification(admin.id, vr.id, "documents_reviewed", "Checked NTN certificate");
  const [biz2] = await db.select().from(s.businesses).where(eq(s.businesses.id, biz.id));
  assert(biz2.verificationLevel === "documents_reviewed", "business verification level updated");
  const [vr2] = await db.select().from(s.businessVerifications).where(eq(s.businessVerifications.id, vr.id));
  assert(vr2.status === "approved" && vr2.reviewerId === admin.id, "verification approved with reviewer");
  // reset sample level so public fork data stays as seeded
  await db.update(s.businesses).set({ verificationLevel: biz.verificationLevel }).where(eq(s.businesses.id, biz.id));

  // 3. suspend + reactivate seller
  await U.suspendUser(actor, seller.id, "Test suspension");
  const [s1] = await db.select().from(s.profiles).where(eq(s.profiles.id, seller.id));
  assert(s1.status === "suspended", "user suspended");
  const paused = await db.select().from(s.listings).where(and(eq(s.listings.businessId, biz.id), eq(s.listings.status, "paused")));
  assert(paused.length > 0, "published listings paused on suspension (" + paused.length + ")");
  await U.reactivateUser(actor, seller.id);
  const [s2] = await db.select().from(s.profiles).where(eq(s.profiles.id, seller.id));
  const pausedAfter = await db.select().from(s.listings).where(and(eq(s.listings.businessId, biz.id), eq(s.listings.status, "paused")));
  assert(s2.status === "active" && pausedAfter.length === 0, "user reactivated and listings restored");
  // non-super-admin cannot grant admin role
  err = "";
  try { await U.assignRole({ id: admin.id, roles: ["support_agent"] }, seller.id, "listing_moderator"); } catch (e) { err = (e as Error).message; }
  assert(err.includes("super admin"), "non-super-admin cannot grant admin roles");

  // 4. case workflow
  const [cs] = await db.select().from(s.supportCases).where(eq(s.supportCases.reference, ref));
  await C.assignCase(admin.id, cs.id, admin.id);
  await C.addCaseNote(admin.id, cs.id, "Checked with seller");
  await C.setCaseStatus(admin.id, cs.id, "resolved", "Price was a typo; seller corrected it");
  const [cs2] = await db.select().from(s.supportCases).where(eq(s.supportCases.id, cs.id));
  assert(cs2.status === "resolved" && cs2.notes.length === 1 && cs2.resolvedAt, "case assigned, noted, resolved");

  // 5. audit entries
  const audits = await db.select().from(s.adminAuditLogs).where(eq(s.adminAuditLogs.actorId, admin.id)).orderBy(desc(s.adminAuditLogs.createdAt)).limit(30);
  const actions = new Set(audits.map((x) => x.action));
  for (const need of ["listing.approve", "listing.reject", "listing.flag_price", "verification.claim", "verification.approve", "user.suspend", "user.reactivate", "case.assign", "case.note", "case.status"]) assert(actions.has(need), "audit has " + need);

  // cleanup test listings
  await db.delete(s.listings).where(like(s.listings.title, "[Test]%"));
  console.log("ALL PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
