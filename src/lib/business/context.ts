import "server-only";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { getBusinessForUser, type BusinessRow } from "./queries";

/** Shared context for seller dashboard pages. */
export async function getSellerContext(nextPath: string) {
  const user = await requireUserPage(nextPath);
  const { t, locale } = await getT();
  const business: BusinessRow | null = await getBusinessForUser(user.id);
  return { user, business, t, locale };
}
