import { redirectOr404 } from "@/lib/seo/redirects";

/** Root catch-all: unknown multi-segment paths check admin redirects, then 404. */
export default async function CatchAll() {
  await redirectOr404();
  return null;
}
