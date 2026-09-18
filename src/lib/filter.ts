import type { EvoNode } from './schema';

/** Resolves the children of a node id — injected so this module stays pure/testable. */
export type Kids = (id: string) => EvoNode[];

export function hasLivingDescendant(node: EvoNode, kids: Kids): boolean {
  if (node.status === 'survived') return true;
  return kids(node.id).some((c) => hasLivingDescendant(c, kids));
}

export function isVisibleLiving(node: EvoNode, kids: Kids, livingOnly: boolean): boolean {
  if (!livingOnly) return true;
  return node.status === 'survived' || hasLivingDescendant(node, kids);
}

/** Extinct node kept visible only because it is an ancestor of a living group. */
export function isAncestorOnly(node: EvoNode, kids: Kids, livingOnly: boolean): boolean {
  if (!livingOnly) return false;
  return node.status !== 'survived' && hasLivingDescendant(node, kids);
}

export function matchesQuery(node: EvoNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return `${node.name.pl} ${node.name.en}`.toLowerCase().includes(q);
}

export function hasMatchInSubtree(node: EvoNode, kids: Kids, query: string): boolean {
  if (matchesQuery(node, query)) return true;
  return kids(node.id).some((c) => hasMatchInSubtree(c, kids, query));
}

export function isVisibleForQuery(node: EvoNode, kids: Kids, query: string): boolean {
  if (!query) return true;
  return hasMatchInSubtree(node, kids, query);
}

export function isVisible(node: EvoNode, kids: Kids, livingOnly: boolean, query: string): boolean {
  return isVisibleLiving(node, kids, livingOnly) && isVisibleForQuery(node, kids, query);
}
