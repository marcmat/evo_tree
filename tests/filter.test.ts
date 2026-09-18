import { describe, expect, it } from 'vitest';
import {
  hasLivingDescendant,
  isAncestorOnly,
  isVisibleForQuery,
  isVisibleLiving,
  matchesQuery,
} from '../src/lib/filter';
import type { EvoNode } from '../src/lib/schema';

// Minimal fixture: root → [alive, deadLeaf, deadBranch → aliveDeep]
function n(id: string, status: EvoNode['status'], pl: string, en: string): EvoNode {
  return { id, status, name: { pl, en } } as unknown as EvoNode;
}
const alive = n('alive', 'survived', 'Rekiny', 'Sharks');
const deadLeaf = n('deadLeaf', 'extinct', 'Plakodermy', 'Placoderms');
const deadBranch = n('deadBranch', 'extinct', 'Synapsydy', 'Synapsids');
const aliveDeep = n('aliveDeep', 'survived', 'Ssaki', 'Mammals');

const childrenMap: Record<string, EvoNode[]> = {
  root: [alive, deadLeaf, deadBranch],
  deadBranch: [aliveDeep],
};
const kids = (id: string) => childrenMap[id] ?? [];

describe('living-descendant logic', () => {
  it('a survived node has a living descendant (itself counts)', () => {
    expect(hasLivingDescendant(alive, kids)).toBe(true);
  });
  it('extinct branch with a living child counts as living', () => {
    expect(hasLivingDescendant(deadBranch, kids)).toBe(true);
  });
  it('extinct leaf without living descendants does not', () => {
    expect(hasLivingDescendant(deadLeaf, kids)).toBe(false);
  });
});

describe('living-only visibility', () => {
  it('shows everything when the filter is off', () => {
    expect(isVisibleLiving(deadLeaf, kids, false)).toBe(true);
  });
  it('hides purely extinct leaves', () => {
    expect(isVisibleLiving(deadLeaf, kids, true)).toBe(false);
  });
  it('keeps extinct ancestors of living groups', () => {
    expect(isVisibleLiving(deadBranch, kids, true)).toBe(true);
    expect(isAncestorOnly(deadBranch, kids, true)).toBe(true);
    expect(isAncestorOnly(alive, kids, true)).toBe(false);
  });
});

describe('search', () => {
  it('empty query matches all', () => {
    expect(matchesQuery(alive, '')).toBe(true);
  });
  it('matches across PL and EN names, case-insensitive', () => {
    expect(matchesQuery(alive, 'shark')).toBe(true);
    expect(matchesQuery(alive, 'REKIN')).toBe(true);
    expect(matchesQuery(alive, 'ssak')).toBe(false);
  });
  it('a node is visible for query if any descendant matches', () => {
    expect(isVisibleForQuery(deadBranch, kids, 'mammals')).toBe(true);
    expect(isVisibleForQuery(deadBranch, kids, 'nonexistent')).toBe(false);
  });
});
