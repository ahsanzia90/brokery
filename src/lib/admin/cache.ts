import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/** Next's revalidate helpers throw outside a request scope (scripts, cron, tests); ignore that so services stay testable. */
function safe(fn: () => void) {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof Error && /static generation store missing/i.test(e.message))) throw e;
  }
}

/** Call after admin writes so cached public data refreshes immediately. */
export function revalidateTaxonomy() {
  safe(() => revalidateTag("taxonomy"));
  safe(() => revalidatePath("/", "layout"));
}
export function revalidateLocations() {
  safe(() => revalidateTag("locations"));
}
export function revalidateSettings() {
  safe(() => revalidateTag("settings"));
  safe(() => revalidatePath("/", "layout"));
}
export function revalidatePublic(path = "/") {
  safe(() => revalidatePath(path));
}
