import erasData from '../data/eras.json';
import eventsData from '../data/events.json';
import i18nData from '../data/i18n.json';
import nodesData from '../data/nodes.json';
import type { Eras, EvoEvent, EvoNode, I18n } from './schema';

// JSON is validated against the Zod schema in tests; the app trusts it at runtime.
export const nodes = nodesData as unknown as EvoNode[];
export const eras = erasData as unknown as Eras;
export const i18n = i18nData as unknown as I18n;
export const events = eventsData as unknown as EvoEvent[];

export const byId = new Map<string, EvoNode>(nodes.map((n) => [n.id, n]));
export const eventById = new Map<string, EvoEvent>(events.map((e) => [e.id, e]));

const childMap = new Map<string | null, EvoNode[]>();
for (const n of nodes) {
  const list = childMap.get(n.parentId);
  if (list) list.push(n);
  else childMap.set(n.parentId, [n]);
}

export const roots: EvoNode[] = childMap.get(null) ?? [];

export function children(id: string): EvoNode[] {
  return childMap.get(id) ?? [];
}

/** Ids of all ancestors of `id`, nearest first. */
export function ancestorsOf(id: string): string[] {
  const out: string[] = [];
  let cur = byId.get(id)?.parentId ?? null;
  while (cur) {
    out.push(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return out;
}

/** Ids of a node plus all its ancestors — the lineage path to the root. */
export function pathIds(id: string): Set<string> {
  return new Set<string>([id, ...ancestorsOf(id)]);
}
