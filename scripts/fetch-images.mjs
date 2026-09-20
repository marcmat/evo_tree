// Sources one freely-licensed image per group from Wikimedia Commons.
//
// Re-runnable: groups already present in images.json are skipped unless --force,
// so a partial run can be resumed and a single bad pick can be redone in isolation
// with --only=<nodeId>.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks automated clients to identify themselves; anonymous bulk
// requests get throttled or blocked outright.
const UA = 'EvoTreeBot/1.0 (https://marcmat.github.io/evo_tree/; educational hobby project)';
const THUMB_WIDTH = 500;
const OUT_DIR = new URL('../public/species/', import.meta.url);
const MANIFEST = new URL('../src/data/images.json', import.meta.url);

/**
 * Search terms for groups whose lead example collides with something else on
 * Commons. Found by reviewing the fetched set: "Gecko" returned an open-air
 * concert, "Pterodactyl" a rock band, "Saturnalia" an Antoine Callet painting,
 * and "Repenomamus" a size-comparison chart with a human silhouette.
 */
const SEARCH_OVERRIDES = {
  lacertilia: 'Gekkonidae',
  pterosauria: 'Pterodactylus',
  eutriconodonta: 'Repenomamus robustus',
};

/**
 * Exact files, pinned after looking at what search returned. Search ranking alone
 * could not reach these: the alternatives were scale drawings with a human
 * silhouette, or annotated specimen photographs that read as diagrams rather than
 * as animals.
 */
const FILE_OVERRIDES = {
  sauropodomorpha: 'File:Saturnalia tupiniquim.jpg',
  archosauria: 'File:Euparkeria white background.png',
  gnathostomata: 'File:Entelognathus.png',
  // Groups whose museum mounts and specimen plates carry titles the reject list
  // cannot see — named after a city or an accession number rather than "skeleton".
  placentalia: 'File:Protungulatum.png',
  prosauropoda: 'File:Plateosaurus picture.png',
  pterosauria: 'File:Pterodactylus BMMS7 life.png',
  rhynchosauria: 'File:Rhynchosaurus articeps.png',
  theropoda: 'File:Tyrannosaurus rex Reconstruction by Nobu Tamura.jpg',
  thyreophora: "File:Nobu Tamura's Scutellosaurus Mirrored.jpg",
  cephalochordata: 'File:Branchiostoma lanceolatum.jpg',
  actinopterygii: 'File:Rainbow Trout (Oncorhynchus mykiss) Gavins Point.jpg',
  sauropterygia: 'File:Keichousaurus BW.jpg',
};

/**
 * The picture has to show a whole living animal. Bones, isolated body parts and
 * figures are rejected outright rather than merely ranked down: a child looking at
 * "Temnospondyle" should see the creature, not a skull in a vitrine, and a group
 * left without any picture falls back to the sprite icon — which is a better
 * outcome than a photograph of a rock.
 */
const REJECT_TITLE =
  /\b(skull|skeleton|skeletal|fossil|specimen|holotype|cranium|mandible|jaw|bone|teeth|tooth|vertebra\w*|claw|slab|cast|footprint|track|egg|coprolite|size|scale|diagram|chart|cladogram|phylogen|map|restoration of the skull)\b/i;

/** Titles that signal a life restoration; palaeoartists sign with initials. */
const PREFER_TITLE = /\b(life restoration|restoration|reconstruction|NT|BW|DB|alive|in life)\b/;

/**
 * Free licences only. NonCommercial and NoDerivatives are rejected before the
 * CC BY prefix test, because "CC BY-NC 4.0" would otherwise pass it.
 */
function licenceAllowed(name) {
  if (!name) return false;
  const n = name.trim();
  if (/\bN[CD]\b|noncommercial|no derivat/i.test(n)) return false;
  return /^CC0/i.test(n) || /public domain/i.test(n) || /^CC BY(-SA)?\b/i.test(n);
}

const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API ${res.status} for ${params.gsrsearch ?? ''}`);
  return res.json();
}

/** Shapes one API imageinfo record into the fields the manifest needs. */
function toHit(page) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const meta = info.extmetadata ?? {};
  const licence = stripHtml(meta.LicenseShortName?.value);
  if (!licenceAllowed(licence)) return null;
  return {
    title: page.title,
    // Must be the API-provided thumburl: a hand-built upload.wikimedia.org
    // path returns HTTP 400.
    thumburl: info.thumburl,
    author: stripHtml(meta.Artist?.value) || 'Wikimedia Commons',
    license: licence,
    licenseUrl: stripHtml(meta.LicenseUrl?.value) || 'https://commons.wikimedia.org',
    sourceUrl: info.descriptionurl,
    mime: info.mime,
  };
}

/** A specific pinned file, bypassing search entirely. */
async function findImageByTitle(title) {
  const data = await api({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: String(THUMB_WIDTH),
  });
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) throw new Error(`pinned file not found: ${title}`);
  const hit = toHit(page);
  if (!hit) throw new Error(`pinned file has an unusable licence: ${title}`);
  return hit;
}

/** First Commons hit for `term` carrying an acceptable licence, or null. */
async function findImage(term) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: term,
    gsrnamespace: '6', // File:
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: String(THUMB_WIDTH),
  });
  const pages = Object.values(data?.query?.pages ?? {});
  // The generator returns pages in arbitrary key order; restore search ranking
  // before applying our own preferences.
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const ranked = pages
    .filter((p) => /^image\/(jpeg|png)$/.test(p.imageinfo?.[0]?.mime ?? ''))
    .filter((p) => !REJECT_TITLE.test(p.title))
    .sort((a, b) => Number(PREFER_TITLE.test(b.title)) - Number(PREFER_TITLE.test(a.title)));

  for (const p of ranked) {
    const hit = toHit(p);
    if (hit) return hit;
  }
  return null;
}

/**
 * Real pixel size, read from the file rather than taken from the API, whose
 * reported thumb height is rounded and can be a pixel off — that would leave the
 * width/height attributes describing an aspect ratio the file does not have,
 * which is the exact thing those attributes exist to prevent.
 *
 * Both formats are handled: Commons serves a PNG thumb for a PNG source, and
 * much of the palaeoart worth having is PNG.
 */
function imageSize(buf) {
  const isPng = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
  if (isPng) return { ext: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  const jpeg = jpegSize(buf);
  return jpeg ? { ext: 'jpg', ...jpeg } : null;
}

function jpegSize(buf) {
  let i = 2; // skip SOI
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

async function download(url, dir, id) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // A Wikimedia error page is HTML served with 200 in some edge cases.
  if (buf.subarray(0, 15).toString('latin1').includes('<!DOCTYPE')) {
    throw new Error('got HTML instead of an image');
  }
  const size = imageSize(buf);
  if (!size) throw new Error('unrecognised image format');
  const file = `${id}.${size.ext}`;
  await writeFile(new URL(file, dir), buf);
  return { bytes: buf.length, file, ...size };
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];

const nodes = JSON.parse(
  await readFile(new URL('../src/data/nodes.json', import.meta.url), 'utf8'),
);
let manifest = {};
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {
  /* first run */
}
await mkdir(OUT_DIR, { recursive: true });

const missing = [];
let fetched = 0;
let bytes = 0;

for (const node of nodes) {
  if (only && node.id !== only) continue;
  if (!force && manifest[node.id]) continue;

  // English entries are usually the scientific name, which Commons indexes;
  // the Polish ones are common names and match far less reliably.
  const terms = SEARCH_OVERRIDES[node.id]
    ? [SEARCH_OVERRIDES[node.id]]
    : node.examples.en
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  let hit = null;
  let used = null;
  if (FILE_OVERRIDES[node.id]) {
    hit = await findImageByTitle(FILE_OVERRIDES[node.id]);
    used = terms[0];
    await sleep(350);
  }
  for (const term of hit ? [] : terms) {
    try {
      hit = await findImage(term);
    } catch (err) {
      console.error(`  ! ${node.id} "${term}": ${err.message}`);
    }
    await sleep(350); // be polite to the API
    if (hit) {
      used = term;
      break;
    }
  }

  if (!hit) {
    missing.push(`${node.id} (${node.name.pl}) — tried: ${terms.join(', ')}`);
    console.log(`  – ${node.id}: brak`);
    continue;
  }

  let size;
  try {
    size = await download(hit.thumburl, OUT_DIR, node.id);
    bytes += size.bytes;
  } catch (err) {
    missing.push(`${node.id} — download failed: ${err.message}`);
    console.log(`  ! ${node.id}: ${err.message}`);
    continue;
  }

  manifest[node.id] = {
    file: size.file,
    subject: used,
    author: hit.author,
    license: hit.license,
    licenseUrl: hit.licenseUrl,
    sourceUrl: hit.sourceUrl,
    width: size.width,
    height: size.height,
  };
  fetched++;
  console.log(`  ✓ ${node.id}: ${used} — ${hit.license}`);
}

// Stable key order keeps the diff readable when the script is re-run.
const ordered = Object.fromEntries(
  Object.keys(manifest)
    .sort()
    .map((k) => [k, manifest[k]]),
);
await writeFile(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`);

console.log(`\npobrano: ${fetched} | w manifeście: ${Object.keys(ordered).length}/${nodes.length}`);
console.log(`rozmiar pobranych: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
if (missing.length) {
  console.log(`\nbez obrazka (${missing.length}):`);
  for (const m of missing) console.log(`  ${m}`);
}
