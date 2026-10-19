import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { BrowserContext } from "@playwright/test";

/** Mint a session cookie for a seeded dev user (development only). */
export function sessionCookie(phone: string): string {
  const out = execSync(`npx tsx scripts/dev-session.ts --phone ${phone}`, { encoding: "utf8" });
  const m = out.match(/ml_session=(\S+)/);
  if (!m) throw new Error("could not mint session: " + out);
  return m[1];
}

export async function signInAs(context: BrowserContext, phone: string, baseURL: string) {
  const token = sessionCookie(phone);
  const url = new URL(baseURL);
  await context.addCookies([{ name: "ml_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
}

/** Read the latest dev OTP code printed by the console provider. */
export function latestOtpFromLog(logPath: string, phone: string): string | null {
  const log = readFileSync(logPath, "utf8");
  const re = new RegExp(`code for \\${phone}: (\\d{6})`, "g");
  let last: string | null = null;
  for (const m of log.matchAll(re)) last = m[1];
  return last;
}
