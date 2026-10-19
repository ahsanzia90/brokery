/**
 * Bootstrap or promote an admin account.
 *   npm run admin:create -- --phone +923001234567 --name "Ops Admin" [--role super_admin]
 * The user signs in with the normal OTP flow; this only assigns roles.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import { eq } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const { db } = await import("../src/db");
  const { profiles, userRoles } = await import("../src/db/schema");
  const { normalizePakistanPhone } = await import("../src/lib/utils/phone");
  const phoneRaw = get("phone");
  const role = (get("role") ?? "super_admin") as (typeof userRoles.$inferInsert)["role"];
  if (!phoneRaw) throw new Error("--phone is required");
  const phone = normalizePakistanPhone(phoneRaw);
  if (!phone) throw new Error("Invalid Pakistani phone number");
  let [user] = await db.select().from(profiles).where(eq(profiles.phone, phone));
  if (!user) {
    [user] = await db.insert(profiles).values({ phone, name: get("name") ?? "Admin", isBuyer: true }).returning();
    console.log(`Created profile ${user.id} for ${phone}`);
  }
  await db.insert(userRoles).values({ userId: user.id, role }).onConflictDoNothing();
  await db.insert(userRoles).values({ userId: user.id, role: "buyer" }).onConflictDoNothing();
  console.log(`Assigned role ${role} to ${phone}. Sign in at /login with this number.`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
