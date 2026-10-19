/* eslint-disable no-console */
/**
 * DEVELOPMENT-ONLY sample data.
 *
 * Creates clearly labelled "[Sample]" users, businesses, listings and market prices so
 * the UI can be exercised locally. It refuses to run against production or any non-local
 * database unless `--force` is passed. Never run this against real data.
 *
 * Sample accounts (sign in with OTP; with OTP_PROVIDER=console the code is printed in the
 * server console):
 *   +923000000001  [Sample] Admin   — roles: buyer, seller, super_admin
 *   +923000000002  [Sample] Seller  — roles: seller, buyer
 *   +923000000003  [Sample] Buyer   — role: buyer
 */
import "./env";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../index";
import { slugify } from "./normalize";

const SAMPLE_SOURCE_NAME = "Development sample (not real data)";
const SAMPLE_NOTE = "SAMPLE DATA – not a real market rate";

function guard() {
  const force = process.argv.includes("--force");
  if (process.env.NODE_ENV === "production" && !force) {
    throw new Error("Refusing to seed sample data with NODE_ENV=production (use --force to override).");
  }
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && !force) {
    throw new Error(`Refusing to seed sample data against non-local database host "${host}" (use --force to override).`);
  }
}

async function upsertUser(phone: string, name: string, roles: Array<(typeof schema.roleEnum.enumValues)[number]>, opts: { isSeller: boolean; cityId: string | null }) {
  const [u] = await db
    .insert(schema.profiles)
    .values({ phone, name, phoneVerifiedAt: new Date(), isBuyer: true, isSeller: opts.isSeller, cityId: opts.cityId, language: "en" })
    .onConflictDoUpdate({ target: schema.profiles.phone, set: { name, isSeller: opts.isSeller, cityId: opts.cityId } })
    .returning({ id: schema.profiles.id });
  for (const role of roles) {
    await db.insert(schema.userRoles).values({ userId: u.id, role }).onConflictDoNothing();
  }
  await db.insert(schema.notificationPreferences).values({ userId: u.id }).onConflictDoNothing();
  return u.id;
}

async function lookup() {
  const city = async (slug: string) => {
    const [r] = await db.select({ id: schema.locations.id, parentId: schema.locations.parentId }).from(schema.locations).where(eq(schema.locations.slug, slug));
    if (!r) throw new Error(`city not found: ${slug}`);
    return r;
  };
  const province = async (slug: string) => {
    const [r] = await db.select({ id: schema.locations.id }).from(schema.locations).where(eq(schema.locations.slug, slug));
    return r.id;
  };
  const commodity = async (slug: string) => {
    const [r] = await db.select({ id: schema.commodities.id }).from(schema.commodities).where(eq(schema.commodities.slug, slug));
    if (!r) throw new Error(`commodity not found: ${slug}`);
    return r.id;
  };
  const variety = async (commodityId: string, slug: string) => {
    const rows = await db.select({ id: schema.commodityVarieties.id, slug: schema.commodityVarieties.slug }).from(schema.commodityVarieties).where(eq(schema.commodityVarieties.commodityId, commodityId));
    return rows.find((r) => r.slug === slug)?.id ?? null;
  };
  const grade = async (commodityId: string, slug: string) => {
    const rows = await db.select({ id: schema.commodityGrades.id, slug: schema.commodityGrades.slug }).from(schema.commodityGrades).where(eq(schema.commodityGrades.commodityId, commodityId));
    return rows.find((r) => r.slug === slug)?.id ?? null;
  };
  const unit = async (code: string) => {
    const [r] = await db.select({ id: schema.units.id, baseFactor: schema.units.baseFactor }).from(schema.units).where(eq(schema.units.code, code));
    if (!r) throw new Error(`unit not found: ${code}`);
    return r;
  };
  return { city, province, commodity, variety, grade, unit };
}

async function main() {
  guard();
  const L = await lookup();
  const lahore = await L.city("lahore");
  const karachi = await L.city("karachi");
  const punjab = await L.province("punjab");
  const sindh = await L.province("sindh");

  // Users
  const adminId = await upsertUser("+923000000001", "[Sample] Admin", ["buyer", "seller", "super_admin"], { isSeller: true, cityId: lahore.id });
  const sellerId = await upsertUser("+923000000002", "[Sample] Seller", ["seller", "buyer"], { isSeller: true, cityId: karachi.id });
  const buyerId = await upsertUser("+923000000003", "[Sample] Buyer", ["buyer"], { isSeller: false, cityId: lahore.id });
  console.log(`users: admin=${adminId} seller=${sellerId} buyer=${buyerId}`);

  // Businesses
  const bizDefs = [
    { ownerId: adminId, name: "[Sample] Lahore Grain Traders", slug: "sample-lahore-grain-traders", businessType: "trader" as const, provinceId: punjab, cityId: lahore.id, description: "SAMPLE business for development. Not a real supplier.", publicPhone: "+923000000001", showPhonePublicly: true, verificationLevel: "phone_verified" as const },
    { ownerId: sellerId, name: "[Sample] Karachi Steel & Scrap", slug: "sample-karachi-steel-scrap", businessType: "wholesaler" as const, provinceId: sindh, cityId: karachi.id, description: "SAMPLE business for development. Not a real supplier.", publicPhone: "+923000000002", whatsappNumber: "+923000000002", showPhonePublicly: true, showWhatsappPublicly: true, verificationLevel: "none" as const },
  ];
  const bizIds: string[] = [];
  for (const b of bizDefs) {
    const [row] = await db
      .insert(schema.businesses)
      .values(b)
      .onConflictDoUpdate({ target: schema.businesses.slug, set: { name: b.name, description: b.description } })
      .returning({ id: schema.businesses.id });
    await db.insert(schema.businessMembers).values({ businessId: row.id, userId: b.ownerId, role: "owner" }).onConflictDoNothing();
    bizIds.push(row.id);
  }
  console.log(`businesses: ${bizIds.length}`);

  // Listings
  const rice = await L.commodity("rice");
  const wheat = await L.commodity("wheat");
  const cement = await L.commodity("cement");
  const ironScrap = await L.commodity("iron-scrap-recyclable");
  const bag40 = await L.unit("bag40");
  const bag50 = await L.unit("bag50");
  const kg = await L.unit("kg");
  const mt = await L.unit("mt");
  const maund = await L.unit("maund");

  type ListingDef = {
    businessId: string; createdBy: string; commodityId: string; varietyId: string | null; gradeId: string | null; title: string; description: string;
    priceType: "fixed" | "negotiable" | "quote" | "on_contact"; priceAmount: string | null; priceUnit: { id: string } | null;
    quantity: string; unit: { id: string; baseFactor: string | null }; provinceId: string; cityId: string; packaging?: string;
  };
  const listingDefs: ListingDef[] = [
    { businessId: bizIds[0], createdBy: adminId, commodityId: rice, varietyId: await L.variety(rice, "super-basmati"), gradeId: await L.grade(rice, "5-percent-broken"), title: "[Sample] Super Basmati rice, 5% broken, crop 2025", description: "SAMPLE listing for development. Not real stock.", priceType: "negotiable", priceAmount: "9500.00", priceUnit: bag40, quantity: "500", unit: bag40, provinceId: punjab, cityId: lahore.id, packaging: "PP bag 40 kg" },
    { businessId: bizIds[0], createdBy: adminId, commodityId: rice, varietyId: await L.variety(rice, "irri-9"), gradeId: await L.grade(rice, "15-percent-broken"), title: "[Sample] IRRI-9 (Zero 9) rice, 15% broken", description: "SAMPLE listing for development. Not real stock.", priceType: "quote", priceAmount: null, priceUnit: null, quantity: "50", unit: mt, provinceId: punjab, cityId: lahore.id },
    { businessId: bizIds[0], createdBy: adminId, commodityId: wheat, varietyId: await L.variety(wheat, "white-wheat"), gradeId: await L.grade(wheat, "grade-a"), title: "[Sample] White wheat, Grade A, Punjab", description: "SAMPLE listing for development. Not real stock.", priceType: "fixed", priceAmount: "3900.00", priceUnit: maund, quantity: "2000", unit: maund, provinceId: punjab, cityId: lahore.id },
    { businessId: bizIds[1], createdBy: sellerId, commodityId: cement, varietyId: await L.variety(cement, "opc"), gradeId: await L.grade(cement, "opc-53"), title: "[Sample] OPC cement 50 kg bags", description: "SAMPLE listing for development. Not real stock.", priceType: "fixed", priceAmount: "1350.00", priceUnit: bag50, quantity: "1000", unit: bag50, provinceId: sindh, cityId: karachi.id, packaging: "50 kg paper bag" },
    { businessId: bizIds[1], createdBy: sellerId, commodityId: ironScrap, varietyId: null, gradeId: await L.grade(ironScrap, "hms-1"), title: "[Sample] Iron scrap HMS 1, ex-Shershah", description: "SAMPLE listing for development. Not real stock.", priceType: "negotiable", priceAmount: "165.00", priceUnit: kg, quantity: "30", unit: mt, provinceId: sindh, cityId: karachi.id },
    { businessId: bizIds[1], createdBy: sellerId, commodityId: ironScrap, varietyId: null, gradeId: await L.grade(ironScrap, "mixed"), title: "[Sample] Mixed iron scrap, pickup available", description: "SAMPLE listing for development. Not real stock.", priceType: "on_contact", priceAmount: null, priceUnit: null, quantity: "10", unit: mt, provinceId: sindh, cityId: karachi.id },
  ];
  let listingCount = 0;
  for (const d of listingDefs) {
    const slug = slugify(d.title);
    const quantityKg = d.unit.baseFactor ? (Number(d.quantity) * Number(d.unit.baseFactor)).toFixed(3) : null;
    const values = {
      businessId: d.businessId, createdBy: d.createdBy, commodityId: d.commodityId, varietyId: d.varietyId, gradeId: d.gradeId, slug, title: d.title, description: d.description,
      priceType: d.priceType, priceAmount: d.priceAmount, priceUnitId: d.priceUnit?.id ?? null, quantity: d.quantity, unitId: d.unit.id, quantityKg,
      provinceId: d.provinceId, cityId: d.cityId, packaging: d.packaging ?? null, status: "published" as const, publishedAt: new Date(), moderatedBy: adminId, moderatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    };
    const [row] = await db
      .insert(schema.listings)
      .values(values)
      .onConflictDoUpdate({ target: schema.listings.slug, set: { title: d.title, status: "published" } })
      .returning({ id: schema.listings.id, createdAt: schema.listings.createdAt, updatedAt: schema.listings.updatedAt });
    const isNew = row.createdAt.getTime() === row.updatedAt.getTime();
    if (isNew) await db.insert(schema.listingStatusHistory).values({ listingId: row.id, previousStatus: null, newStatus: "published", actorId: adminId, reason: "dev sample" });
    listingCount++;
  }
  console.log(`listings: ${listingCount}`);

  // Prices
  let [source] = await db.select({ id: schema.priceSources.id }).from(schema.priceSources).where(eq(schema.priceSources.name, SAMPLE_SOURCE_NAME));
  if (!source) [source] = await db.insert(schema.priceSources).values({ name: SAMPLE_SOURCE_NAME, sourceType: "other", reference: "Generated by db:seed:dev" }).returning({ id: schema.priceSources.id });

  const today = new Date().toISOString().slice(0, 10);
  const priceDefs = [
    { commodityId: rice, varietyId: await L.variety(rice, "super-basmati"), gradeId: null, locationId: lahore.id, amount: "9400.00", unitId: bag40.id, low: "9200.00", high: "9600.00" },
    { commodityId: rice, varietyId: await L.variety(rice, "irri-6"), gradeId: null, locationId: karachi.id, amount: "4300.00", unitId: bag40.id, low: null, high: null },
    { commodityId: wheat, varietyId: null, gradeId: null, locationId: lahore.id, amount: "3850.00", unitId: maund.id, low: "3800.00", high: "3900.00" },
    { commodityId: cement, varietyId: await L.variety(cement, "opc"), gradeId: null, locationId: karachi.id, amount: "1340.00", unitId: bag50.id, low: null, high: null },
  ];
  // Supersede previously published sample records (the unique partial index allows one published
  // record per commodity/variety/grade/location/unit/type), then publish a fresh set.
  await db.update(schema.marketPrices).set({ status: "superseded" }).where(eq(schema.marketPrices.sourceId, source.id));
  let priceCount = 0;
  for (const p of priceDefs) {
    const [row] = await db
      .insert(schema.marketPrices)
      .values({
        commodityId: p.commodityId, varietyId: p.varietyId, gradeId: p.gradeId, locationId: p.locationId, amount: p.amount, unitId: p.unitId, priceType: "indicative",
        lowAmount: p.low, highAmount: p.high, observationDate: today, publishedAt: new Date(), sourceId: source.id, notes: SAMPLE_NOTE, status: "published", createdBy: adminId, reviewerId: adminId, reviewedAt: new Date(),
      })
      .returning({ id: schema.marketPrices.id });
    await db.insert(schema.priceHistory).values({ priceId: row.id, version: 1, action: "published", snapshot: { ...p, observationDate: today, notes: SAMPLE_NOTE }, actorId: adminId, reason: "dev sample" });
    priceCount++;
  }
  console.log(`market prices: ${priceCount} (source: "${SAMPLE_SOURCE_NAME}")`);
  console.log("Dev sample data ready. All rows are labelled [Sample] / SAMPLE DATA.");
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
