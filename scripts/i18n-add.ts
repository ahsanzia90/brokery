/**
 * Merge translation keys into both dictionaries without clobbering concurrent edits.
 * Usage: npx tsx scripts/i18n-add.ts path/to/snippet.json
 * Snippet shape: { "key": { "en": "English", "ur": "اردو" }, ... }
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const snippetPath = process.argv[2];
if (!snippetPath) throw new Error("snippet path required");
const snippet = JSON.parse(readFileSync(snippetPath, "utf8")) as Record<string, { en: string; ur: string }>;
const dir = path.join(process.cwd(), "src/lib/i18n/messages");
for (const lang of ["en", "ur"] as const) {
  const file = path.join(dir, `${lang}.json`);
  const current = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
  let added = 0;
  for (const [k, v] of Object.entries(snippet)) {
    if (current[k] === undefined && v[lang] !== undefined) {
      current[k] = v[lang];
      added++;
    }
  }
  writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
  console.log(`${lang}: added ${added} keys`);
}
