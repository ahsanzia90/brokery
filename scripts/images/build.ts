/**
 * Builds the commodity photo library used by "photo mode".
 *
 *   npm run images:build
 *
 * For every key in src/lib/visual/photos.ts (PHOTO_SPEC) the first of these that exists wins:
 *   1. assets/photos/<key>.(jpg|png|webp|avif)          – your own photo (always takes precedence)
 *   2. assets/photos/sources.json                        – curated, freely licensed photos fetched at build
 *                                                          time (Unsplash / Pexels); candidates tried in order
 *   3. assets/photos/fallback/<key>.(jpg|png|webp|avif)  – committed fallback used when downloads fail
 * Keys with none of the above keep the illustration.
 *
 * Output: public/images/commodities/<key>.webp (≤1400px, q80), src/lib/visual/manifest.json ({ keys }),
 * src/lib/visual/credits.json (what was used and from where) and public/images/commodities/CREDITS.md.
 * Downloads are cached in .next/cache/photos so repeat builds (and Vercel's build cache) skip the network.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.resolve(ROOT, "assets/photos");
const FALLBACK = path.join(SRC, "fallback");
const OUT = path.resolve(ROOT, "public/images/commodities");
const CACHE = path.resolve(ROOT, ".next/cache/photos");
const MANIFEST = path.resolve(ROOT, "src/lib/visual/manifest.json");
const CREDITS_JSON = path.resolve(ROOT, "src/lib/visual/credits.json");
const CREDITS_MD = path.join(OUT, "CREDITS.md");
const SOURCES = process.env.PHOTO_SOURCES ? path.resolve(ROOT, process.env.PHOTO_SOURCES) : path.join(SRC, "sources.json");
const OFFLINE = process.env.PHOTO_OFFLINE === "1";
const MAX_W = 1400;
const MIN_W = 600;
const MIN_W_FALLBACK = 300;
const TIMEOUT_MS = 25_000;
const CONCURRENCY = 4;

type Candidate = { unsplash?: string; pexels?: number; url?: string; title?: string; author?: string; licence?: string };
type Source = { key: string; candidates: Candidate[] };
type Credit = { key: string; origin: "local" | "download" | "fallback"; source?: string; title?: string; author?: string; page?: string; licence?: string };

const IMG_RE = /\.(jpe?g|png|webp|avif)$/i;

function localFile(dir: string, key: string): string | null {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => IMG_RE.test(n) && n.replace(IMG_RE, "").toLowerCase() === key);
  return f ? path.join(dir, f) : null;
}

function resolveCandidate(c: Candidate): { url: string; page: string; source: string; licence: string } | null {
  if (c.url) return { url: c.url, page: c.url, source: "url", licence: c.licence ?? "see source" };
  if (c.unsplash) {
    return {
      url: `https://unsplash.com/photos/${c.unsplash}/download?force=true&w=${MAX_W + 200}`,
      page: `https://unsplash.com/photos/${c.unsplash}`,
      source: "Unsplash",
      licence: c.licence ?? "Unsplash License",
    };
  }
  if (c.pexels) {
    return {
      url: `https://images.pexels.com/photos/${c.pexels}/pexels-photo-${c.pexels}.jpeg?auto=compress&cs=tinysrgb&w=${MAX_W + 200}`,
      page: `https://www.pexels.com/photo/${c.pexels}/`,
      source: "Pexels",
      licence: c.licence ?? "Pexels License",
    };
  }
  return null;
}

async function fetchBytes(url: string): Promise<Buffer> {
  const cacheFile = path.join(CACHE, createHash("sha1").update(url).digest("hex"));
  if (existsSync(cacheFile)) return readFileSync(cacheFile);
  if (OFFLINE) throw new Error("offline");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "mandilink-image-build/1.0 (+https://github.com/ahsanzia90/brokery)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new Error(`not an image (${type || "no content-type"})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) throw new Error("file too small");
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cacheFile, buf);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/** Validates that the bytes decode as a reasonably sized photo. */
async function usable(input: Buffer | string, minWidth = MIN_W): Promise<boolean> {
  try {
    const m = await sharp(input).metadata();
    return (m.width ?? 0) >= minWidth && (m.height ?? 0) >= 240;
  } catch {
    return false;
  }
}

async function writeWebp(input: Buffer | string, key: string) {
  await sharp(input)
    .rotate()
    .resize({ width: MAX_W, height: MAX_W, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `${key}.webp`));
}

async function buildKey(key: string, candidates: Candidate[]): Promise<Credit | null> {
  const own = localFile(SRC, key);
  if (own) {
    await writeWebp(own, key);
    return { key, origin: "local", source: path.relative(ROOT, own) };
  }
  for (const c of candidates) {
    const r = resolveCandidate(c);
    if (!r) continue;
    try {
      const bytes = await fetchBytes(r.url);
      if (!(await usable(bytes))) throw new Error("image too small or unreadable");
      await writeWebp(bytes, key);
      return { key, origin: "download", source: r.source, title: c.title, author: c.author, page: r.page, licence: r.licence };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!OFFLINE) console.warn(`  · ${key}: ${r.source} ${c.unsplash ?? c.pexels ?? c.url} failed (${msg})`);
    }
  }
  const fb = localFile(FALLBACK, key);
  if (fb && (await usable(fb, MIN_W_FALLBACK))) {
    await writeWebp(fb, key);
    return { key, origin: "fallback", source: path.relative(ROOT, fb) };
  }
  return null;
}

async function main() {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const sources: Source[] = existsSync(SOURCES) ? (JSON.parse(readFileSync(SOURCES, "utf8")) as { sources: Source[] }).sources : [];
  const byKey = new Map(sources.map((s) => [s.key, s.candidates]));
  const keys = new Set<string>(byKey.keys());
  for (const dir of [SRC, FALLBACK]) {
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (IMG_RE.test(f)) keys.add(f.replace(IMG_RE, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
  }
  const all = [...keys].sort();
  if (OFFLINE) console.log("PHOTO_OFFLINE=1 → using only local photos and cached downloads.");
  console.log(`Building ${all.length} photo keys…`);

  const credits: Credit[] = [];
  const missing: string[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < all.length) {
        const key = all[i++]!;
        const c = await buildKey(key, byKey.get(key) ?? []);
        if (c) {
          credits.push(c);
          console.log(`✓ ${key} (${c.origin}${c.source ? `: ${c.source}` : ""})`);
        } else missing.push(key);
      }
    }),
  );
  credits.sort((a, b) => a.key.localeCompare(b.key));
  missing.sort();

  writeFileSync(MANIFEST, JSON.stringify({ keys: credits.map((c) => c.key) }, null, 2) + "\n");
  writeFileSync(CREDITS_JSON, JSON.stringify(credits, null, 2) + "\n");
  const md = [
    "# Photo credits",
    "",
    "Photographs used in photo mode. Unsplash and Pexels images are free to use commercially under their",
    "respective licences; links go to the original page. Your own files in assets/photos replace these.",
    "",
    "| Key | Source | Title | Photographer | Licence |",
    "| --- | --- | --- | --- | --- |",
    ...credits.map((c) =>
      c.origin === "download"
        ? `| ${c.key} | [${c.source}](${c.page}) | ${c.title ?? ""} | ${c.author ?? ""} | ${c.licence ?? ""} |`
        : `| ${c.key} | ${c.origin} file | ${c.source ?? ""} | | |`,
    ),
    "",
  ].join("\n");
  writeFileSync(CREDITS_MD, md);

  console.log(`${credits.length} photos in manifest (${credits.filter((c) => c.origin === "download").length} downloaded, ${credits.filter((c) => c.origin === "local").length} own, ${credits.filter((c) => c.origin === "fallback").length} fallback).`);
  if (missing.length) console.log(`No photo for: ${missing.join(", ")} (illustration will be shown).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
