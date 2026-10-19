import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/** Call after admin writes so cached public data refreshes immediately. */
export function revalidateTaxonomy() {
  revalidateTag("taxonomy");
  revalidatePath("/", "layout");
}
export function revalidateLocations() {
  revalidateTag("locations");
}
export function revalidateSettings() {
  revalidateTag("settings");
  revalidatePath("/", "layout");
}
export function revalidatePublic(path = "/") {
  revalidatePath(path);
}
