import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import erasJson from '../src/data/eras.json';
import i18nJson from '../src/data/i18n.json';
import nodesJson from '../src/data/nodes.json';
import { totalMa } from '../src/lib/eras';
import { ErasSchema, I18nSchema, NodesSchema } from '../src/lib/schema';

describe('data files validate against the schema', () => {
  it('eras.json', () => {
    expect(() => ErasSchema.parse(erasJson)).not.toThrow();
  });
  it('i18n.json', () => {
    expect(() => I18nSchema.parse(i18nJson)).not.toThrow();
  });
  it('nodes.json', () => {
    expect(() => NodesSchema.parse(nodesJson)).not.toThrow();
  });
});

describe('tree integrity', () => {
  const nodes = NodesSchema.parse(nodesJson);
  const ids = new Set(nodes.map((n) => n.id));

  it('has exactly one root', () => {
    expect(nodes.filter((n) => n.parentId === null)).toHaveLength(1);
  });
  it('has no duplicate ids', () => {
    expect(ids.size).toBe(nodes.length);
  });
  it('every parentId references an existing node', () => {
    const orphans = nodes.filter((n) => n.parentId !== null && !ids.has(n.parentId));
    expect(orphans).toEqual([]);
  });
  it('has no cycles (every node reaches the root)', () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      let cur: string | null = n.id;
      let steps = 0;
      while (cur && steps <= nodes.length) {
        cur = byId.get(cur)?.parentId ?? null;
        steps++;
      }
      expect(steps).toBeLessThanOrEqual(nodes.length);
    }
  });
  it('every icon exists in the SVG sprite', () => {
    const sprite = readFileSync(
      fileURLToPath(new URL('../src/components/Sprite.svelte', import.meta.url)),
      'utf8',
    );
    const spriteIds = new Set([...sprite.matchAll(/id="(ic-[a-z-]+)"/g)].map((m) => m[1]));
    for (const n of nodes) expect(spriteIds.has(n.icon)).toBe(true);
  });
});

describe('dates (Ma)', () => {
  const nodes = NodesSchema.parse(nodesJson);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const eras = ErasSchema.parse(erasJson);

  it('startMa is strictly after endMa for every node', () => {
    for (const n of nodes) expect(n.startMa).toBeGreaterThan(n.endMa);
  });
  it('a child never starts older than its parent', () => {
    for (const n of nodes) {
      if (n.parentId === null) continue;
      const parent = byId.get(n.parentId);
      expect(parent).toBeDefined();
      expect(n.startMa).toBeLessThanOrEqual(parent?.startMa ?? Number.POSITIVE_INFINITY);
    }
  });
  it('endMa is within [0, totalMa] and startMa never exceeds totalMa', () => {
    for (const n of nodes) {
      expect(n.endMa).toBeGreaterThanOrEqual(0);
      expect(n.startMa).toBeLessThanOrEqual(totalMa);
    }
  });
  it('survived nodes end at present (endMa === 0)', () => {
    for (const n of nodes) if (n.status === 'survived') expect(n.endMa).toBe(0);
  });
  it('extinct nodes have a non-zero end date', () => {
    for (const n of nodes) if (n.status === 'extinct') expect(n.endMa).toBeGreaterThan(0);
  });
  // Cladogram-internal nodes (status: null) may legitimately end at present too —
  // e.g. mammalia, squamata, theropoda — this just confirms the schema/refine
  // doesn't reject that combination; it isn't implied by (nor implies) survival.
  it('a null-status node ending at present is not rejected by the schema', () => {
    const stillLiving = nodes.filter((n) => n.status === null && n.endMa === 0);
    expect(stillLiving.length).toBeGreaterThan(0);
  });
  // A clade containing a living member has not ended: Dinosauria runs to the present
  // because birds are alive, so Synapsida must too because mammals are. Nodes marked
  // `extinct` are the deliberate exception — those are paraphyletic grades
  // (e.g. cynodontia, temnospondyli) that exclude their surviving descendants.
  it('a null-status clade with any living descendant ends at present', () => {
    const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);
    const hasLivingDescendant = (n: (typeof nodes)[number]): boolean =>
      n.status === 'survived' || childrenOf(n.id).some(hasLivingDescendant);
    const inconsistent = nodes
      .filter((n) => n.status === null && n.endMa !== 0 && hasLivingDescendant(n))
      .map((n) => `${n.id} ends at ${n.endMa} Ma`);
    expect(inconsistent).toEqual([]);
  });
  it('era boundaries in eras.json are contiguous, oldest to present, with no gaps', () => {
    const order = Object.keys(eras);
    expect(eras[order[0]].startMa).toBe(totalMa);
    expect(eras[order[order.length - 1]].endMa).toBe(0);
    for (let i = 0; i < order.length - 1; i++) {
      expect(eras[order[i]].endMa).toBe(eras[order[i + 1]].startMa);
    }
  });
});
