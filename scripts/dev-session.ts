/**
 * DEVELOPMENT ONLY: mint a session cookie for an existing user so workflows can be
 * exercised with curl. Refuses to run in production.
 *   npx tsx scripts/dev-session.ts --phone +923000000001
 * Prints: ml_session=<token>
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import { eq } from "drizzle-orm";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const i = process.argv.indexOf("--phone");
  const phoneRaw = i >= 0 ? process.argv[i + 1] : undefined;
  if (!phoneRaw) throw new Error("--phone required");
  const { db } = await import("../src/db");
  const { profiles, sessions } = await import("../src/db/schema");
  const { normalizePakistanPhone } = await import("../src/lib/utils/phone");
  const { createHash, randomBytes } = await import("node:crypto");
  const phone = normalizePakistanPhone(phoneRaw)!;
  const [user] = await db.select().from(profiles).where(eq(profiles.phone, phone));
  if (!user) throw new Error("No such user");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token + process.env.AUTH_SECRET).digest("hex");
  await db.insert(sessions).values({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86_400_000) });
  console.log(`ml_session=${token}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
