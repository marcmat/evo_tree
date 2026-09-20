import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import imagesJson from '../src/data/images.json';
import nodesJson from '../src/data/nodes.json';
import { ImagesSchema, NodesSchema } from '../src/lib/schema';

describe('images.json validates against the schema', () => {
  it('parses', () => {
    expect(() => ImagesSchema.parse(imagesJson)).not.toThrow();
  });
});

describe('image manifest integrity', () => {
  const images = ImagesSchema.parse(imagesJson);
  const nodes = NodesSchema.parse(nodesJson);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const entries = Object.entries(images);

  it('every entry belongs to a real group', () => {
    const orphans = entries.map(([id]) => id).filter((id) => !nodeIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('every referenced file exists under public/species', () => {
    const missing = entries
      .filter(
        ([, v]) =>
          !existsSync(fileURLToPath(new URL(`../public/species/${v.file}`, import.meta.url))),
      )
      .map(([id, v]) => `${id} → ${v.file}`);
    expect(missing).toEqual([]);
  });

  // CC BY and CC BY-SA are conditional licences: the grant depends on naming the
  // author, the licence and where the work came from. A blank field is not a
  // cosmetic gap, it is us using the picture outside the terms we were given.
  it('every entry carries complete attribution', () => {
    const incomplete: string[] = [];
    for (const [id, v] of entries) {
      if (!v.author.trim()) incomplete.push(`${id}: author`);
      if (!v.license.trim()) incomplete.push(`${id}: license`);
      if (!v.licenseUrl.trim()) incomplete.push(`${id}: licenseUrl`);
      if (!v.sourceUrl.trim()) incomplete.push(`${id}: sourceUrl`);
    }
    expect(incomplete).toEqual([]);
  });

  // NonCommercial and NoDerivatives are not free licences; a single one slipping
  // through the fetch script would put the whole site on the wrong side of terms.
  it('no entry uses a NonCommercial or NoDerivatives licence', () => {
    const unfree = entries
      .filter(([, v]) => /\bN[CD]\b|noncommercial|no derivat/i.test(v.license))
      .map(([id, v]) => `${id}: ${v.license}`);
    expect(unfree).toEqual([]);
  });

  it('every licence is one of the free forms we accept', () => {
    const allowed = /^(CC0|CC BY(-SA)?\b|Public domain|PD)/i;
    const odd = entries
      .filter(([, v]) => !allowed.test(v.license))
      .map(([id, v]) => `${id}: ${v.license}`);
    expect(odd).toEqual([]);
  });

  // Reserving the wrong box is barely better than reserving none, so the stored
  // dimensions are read back from the file by the fetch script, not from the API.
  it('every entry declares positive pixel dimensions', () => {
    for (const [id, v] of entries) {
      expect(v.width, `${id} width`).toBeGreaterThan(0);
      expect(v.height, `${id} height`).toBeGreaterThan(0);
    }
  });
});

describe('each group has its own picture', () => {
  const images = ImagesSchema.parse(imagesJson);
  const nodes = NodesSchema.parse(nodesJson);

  // Three parents wore their child's face: Ceratopsia showed Triceratops, which
  // belongs to Ceratopsidae drawn directly beneath it. Same failure as a clade
  // borrowing its subgroup's examples, but pictures were never guarded for it.
  it('no two groups share the same source file', () => {
    const bySource = new Map<string, string[]>();
    for (const [id, v] of Object.entries(images)) {
      const seen = bySource.get(v.sourceUrl) ?? [];
      seen.push(id);
      bySource.set(v.sourceUrl, seen);
    }
    const shared = [...bySource.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([url, ids]) => `${ids.join(' + ')} → ${url}`);
    expect(shared).toEqual([]);
  });

  // A picture pinned before the tree grew can end up showing an animal that has
  // since been given its own branch. The subject must still be one the group
  // itself claims, not one that moved into a descendant.
  it('a picture subject is not claimed by a descendant group', () => {
    const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);
    const descendantsOf = (id: string): typeof nodes => {
      const out: typeof nodes = [];
      const walk = (i: string) => {
        for (const c of childrenOf(i)) {
          out.push(c);
          walk(c.id);
        }
      };
      walk(id);
      return out;
    };
    const stolen: string[] = [];
    for (const [id, v] of Object.entries(images)) {
      const below = descendantsOf(id).flatMap((d) =>
        d.examples.en.split(',').map((s) => s.trim().toLowerCase()),
      );
      const subject = v.subject.trim().toLowerCase();
      if (below.some((e) => e === subject)) stolen.push(`${id} pictures "${v.subject}"`);
    }
    expect(stolen).toEqual([]);
  });
});
