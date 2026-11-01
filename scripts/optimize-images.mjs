// Turns the original photos in images/ into what the site serves from public/: an AVIF (small, sharp, read by every
// current browser) plus a JPEG fallback for older ones. Originals stay in images/ and are never deployed.
// Run it again whenever a photo is added or replaced:
//   npm run images
//
// Quality was chosen by eye at 2.5× magnification (the detail-view lens), not by a number: at AVIF 65 the pencil grain
// and hatching in the drawings match the originals. A JPEG already within the size limit is copied as is for the
// fallback, so it loses nothing to a second compression.
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "images");
const target = join(root, "public");

/**
 * Per folder. maxEdge: longest side served (artworks keep up to 2400 px so the lens has detail to show; the portrait
 * is never shown wider than about 380 px, so 1000 covers 2–3× screens).
 */
const rules = {
  art: { maxEdge: 2400, avif: 65, jpeg: 90 },
  about: { maxEdge: 1000, avif: 60, jpeg: 84 },
};
const fallbackRule = { maxEdge: 2000, avif: 62, jpeg: 86 };

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(jpe?g|png|tiff?|webp|heic)$/i.test(entry.name)) yield path;
  }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`.padStart(7);
let before = 0;
let after = 0;

for await (const file of walk(source)) {
  const rel = relative(source, file);
  const rule = rules[rel.split(/[\\/]/)[0]] ?? fallbackRule;
  const base = join(target, rel.slice(0, -extname(rel).length));
  await mkdir(dirname(base), { recursive: true });

  const meta = await sharp(file).metadata();
  const fits = Math.max(meta.width ?? 0, meta.height ?? 0) <= rule.maxEdge;
  const resize = { width: rule.maxEdge, height: rule.maxEdge, fit: "inside", withoutEnlargement: true };

  const avif = await sharp(file).rotate().resize(resize).avif({ quality: rule.avif, effort: 6 }).toFile(`${base}.avif`);
  const jpegPath = `${base}.jpg`;
  if (fits && /\.jpe?g$/i.test(file) && (meta.orientation ?? 1) === 1) await copyFile(file, jpegPath);
  else await sharp(file).rotate().resize(resize).jpeg({ quality: rule.jpeg, mozjpeg: true, progressive: true }).toFile(jpegPath);
  const jpeg = (await stat(jpegPath)).size;

  const size = (await stat(file)).size;
  before += size;
  after += avif.size;
  console.log(`${rel.padEnd(22)} ${`${avif.width}×${avif.height}`.padEnd(10)} original ${kb(size)}   avif ${kb(avif.size)}   jpg fallback ${kb(jpeg)}`);
}

console.log(`\nWhat most visitors download: ${kb(before).trim()} → ${kb(after).trim()} (${Math.round((1 - after / before) * 100)}% smaller)`);
