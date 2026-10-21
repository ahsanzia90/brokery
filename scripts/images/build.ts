/**
 * Optimises commodity photographs for the site.
 *   Put photos in assets/photos/<key>.jpg|png|webp  (keys: see docs/PHOTOS.md or src/lib/visual/photos.ts)
 *   npm run images:build
 * Writes public/images/commodities/<key>.webp (max 1400px wide, quality 80) and
 * src/lib/visual/manifest.json listing the keys that exist.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("assets/photos");
const OUT = path.resolve("public/images/commodities");
const MANIFEST = path.resolve("src/lib/visual/manifest.json");

async function main() {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  const keys: string[] = [];
  for (const f of files) {
    const key = f.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const out = path.join(OUT, `${key}.webp`);
    await sharp(path.join(SRC, f)).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
    keys.push(key);
    console.log(`✓ ${f} → images/commodities/${key}.webp`);
  }
  keys.sort();
  writeFileSync(MANIFEST, JSON.stringify({ keys }, null, 2) + "\n");
  console.log(`${keys.length} photos in manifest.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
