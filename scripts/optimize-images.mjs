// Turns the original photos in images/ into what the site serves from public/: an AVIF (small, sharp, read by every
// current browser) plus a JPEG fallback for older ones, each in a full size and, where it helps, a small size.
// Originals stay in images/ and are never deployed. Run it again whenever a photo is added or replaced:
//   npm run images
//
// Quality was chosen by eye at 2.5× magnification (the detail-view lens), not by a number: at AVIF 65 the pencil grain
// and hatching in the drawings match the originals. A JPEG already within the size limit is copied as is for the
// fallback, so it loses nothing to a second compression.
//
// The small copy (≤ 900 px wide) is what grids and walls load; the full size loads only when a work is opened. The
// script also writes src/content/images.json with every image's real size, so the site never needs aspect ratios
// typed in by hand.
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "images");
const target = join(root, "public");
const manifestPath = join(root, "src", "content", "images.json");

/**
 * Per folder. maxEdge: longest side served (artworks keep up to 2400 px so the lens has detail to show; portraits up
 * to 1600 px, enough for the opening screen's near-full-height portrait on a 2× screen). small: width of the grid copy,
 * or 0 for none.
 */
const rules = {
  art: { maxEdge: 2400, small: 900, thumb: 420, avif: 65, jpeg: 90 },
  about: { maxEdge: 1600, small: 0, avif: 60, jpeg: 84 },
};
const fallbackRule = { maxEdge: 2000, small: 0, avif: 62, jpeg: 86 };

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(jpe?g|png|tiff?|webp|heic)$/i.test(entry.name)) yield path;
  }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`.padStart(7);
const manifest = {};
let before = 0;
let full = 0;
let grid = 0;

for await (const file of walk(source)) {
  const rel = relative(source, file);
  const key = rel.slice(0, -extname(rel).length).split(/[\\/]/).join("/");
  const rule = rules[key.split("/")[0]] ?? fallbackRule;
  const base = join(target, key);
  await mkdir(dirname(base), { recursive: true });

  const meta = await sharp(file).metadata();
  const fits = Math.max(meta.width ?? 0, meta.height ?? 0) <= rule.maxEdge;
  const resize = { width: rule.maxEdge, height: rule.maxEdge, fit: "inside", withoutEnlargement: true };

  const avif = await sharp(file).rotate().resize(resize).avif({ quality: rule.avif, effort: 6 }).toFile(`${base}.avif`);
  const jpegPath = `${base}.jpg`;
  if (fits && /\.jpe?g$/i.test(file) && (meta.orientation ?? 1) === 1) await copyFile(file, jpegPath);
  else await sharp(file).rotate().resize(resize).jpeg({ quality: rule.jpeg, mozjpeg: true, progressive: true }).toFile(jpegPath);
  const entry = { width: avif.width, height: avif.height };

  let smallNote = "";
  if (rule.small && avif.width > rule.small * 1.15) {
    const smallResize = { width: rule.small, withoutEnlargement: true };
    const smallAvif = await sharp(file).rotate().resize(smallResize).avif({ quality: rule.avif, effort: 6 }).toFile(`${base}-sm.avif`);
    await sharp(file).rotate().resize(smallResize).jpeg({ quality: rule.jpeg - 4, mozjpeg: true, progressive: true }).toFile(`${base}-sm.jpg`);
    entry.small = smallAvif.width;
    grid += smallAvif.size;
    smallNote = `   grid ${kb(smallAvif.size)} @${smallAvif.width}`;
  } else {
    grid += avif.size;
  }
  // A thumbnail for the home page's moving rows of paintings, which show many works small at first load.
  if (rule.thumb && avif.width > rule.thumb * 1.15) {
    const thumbResize = { width: rule.thumb, withoutEnlargement: true };
    await sharp(file).rotate().resize(thumbResize).avif({ quality: rule.avif, effort: 6 }).toFile(`${base}-th.avif`);
    await sharp(file).rotate().resize(thumbResize).jpeg({ quality: rule.jpeg - 6, mozjpeg: true, progressive: true }).toFile(`${base}-th.jpg`);
    entry.thumb = rule.thumb;
  }
  manifest[key] = entry;

  before += (await stat(file)).size;
  full += avif.size;
  console.log(`${rel.padEnd(32)} ${`${avif.width}×${avif.height}`.padEnd(10)} avif ${kb(avif.size)}${smallNote}`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`\nOriginals ${kb(before).trim()} · full-size AVIF ${kb(full).trim()} · what a grid of every work loads ${kb(grid).trim()}`);
console.log(`Wrote ${relative(root, manifestPath)}`);
