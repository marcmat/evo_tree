// Normalises everything under public/species/ into one format, one weight class
// and one frame. Run after scripts/fetch-images.mjs, which downloads whatever
// Commons happens to serve.
//
// Three problems it solves:
//  - weight: PNG palaeoart averaged 99KB against 34KB for JPEG; WebP flattens that
//  - format: a mix of .jpg and .png in the manifest for no reason the reader cares about
//  - frame: source aspect ratios ran from 0.42 to 5.75, so the panel jumped on
//    every click. Everything is fitted into one box instead.
//
// Fit is `contain`, never `cover`: cropping a Diplodocus to fill a frame would
// cut off the head and tail, and the whole point of these pictures is the
// complete animal. Padding is transparent so the panel background shows through
// and the letterbox is invisible whatever the theme.
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const DIR = new URL('../public/species/', import.meta.url);
const MANIFEST = new URL('../src/data/images.json', import.meta.url);
const WIDTH = 480;
const HEIGHT = 320; // 3:2, close to the median source ratio of 1.63
const QUALITY = 82;

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const before = { bytes: 0, files: 0 };
const after = { bytes: 0, files: 0 };

for (const [id, entry] of Object.entries(manifest)) {
  const src = new URL(entry.file, DIR);
  const original = await readFile(src);
  before.bytes += original.length;
  before.files++;

  const out = await sharp(original)
    .resize(WIDTH, HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: QUALITY })
    .toBuffer();

  const file = `${id}.webp`;
  await writeFile(new URL(file, DIR), out);
  if (entry.file !== file) await unlink(src);

  manifest[id] = { ...entry, file, width: WIDTH, height: HEIGHT };
  after.bytes += out.length;
  after.files++;
}

const ordered = Object.fromEntries(
  Object.keys(manifest)
    .sort()
    .map((k) => [k, manifest[k]]),
);
await writeFile(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`);

// Anything left behind by an earlier format is dead weight in the repo.
const wanted = new Set(Object.values(ordered).map((v) => v.file));
const stray = (await readdir(DIR)).filter((f) => !wanted.has(f));
for (const f of stray) await unlink(new URL(f, DIR));

const mb = (b) => (b / 1024 / 1024).toFixed(2);
console.log(`znormalizowano: ${after.files} plików → ${WIDTH}x${HEIGHT} WebP q${QUALITY}`);
console.log(`rozmiar: ${mb(before.bytes)} MB → ${mb(after.bytes)} MB`);
console.log(`oszczędność: ${(100 - (after.bytes / before.bytes) * 100).toFixed(0)}%`);
if (stray.length) console.log(`usunięto pozostałości: ${stray.length}`);
