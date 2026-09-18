import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import erasJson from '../src/data/eras.json';
import i18nJson from '../src/data/i18n.json';
import nodesJson from '../src/data/nodes.json';
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
  it('every era key exists in eras.json', () => {
    const eraKeys = new Set(Object.keys(ErasSchema.parse(erasJson)));
    for (const n of nodes) for (const e of n.eras) expect(eraKeys.has(e)).toBe(true);
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
