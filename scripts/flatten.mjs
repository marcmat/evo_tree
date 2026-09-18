// One-off migration: nested data.json -> flat src/data/{nodes,eras,i18n}.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const src = JSON.parse(await readFile(new URL('../data.json', import.meta.url), 'utf8'));

/** Depth-first flatten, preserving sibling order, attaching parentId. */
const nodes = [];
function walk(node, parentId) {
  const { children, ...rest } = node;
  nodes.push({ parentId, ...rest });
  for (const child of children ?? []) walk(child, node.id);
}
walk(src.tree, null);

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const out = new URL('../src/data/', import.meta.url);
await writeFile(new URL('nodes.json', out), `${JSON.stringify(nodes, null, 2)}\n`);
await writeFile(new URL('eras.json', out), `${JSON.stringify(src.eras, null, 2)}\n`);
await writeFile(new URL('i18n.json', out), `${JSON.stringify(src.i18n, null, 2)}\n`);

// Sanity
const ids = new Set(nodes.map((n) => n.id));
const orphans = nodes.filter((n) => n.parentId !== null && !ids.has(n.parentId));
const roots = nodes.filter((n) => n.parentId === null);
console.log(
  'nodes:',
  nodes.length,
  '| roots:',
  roots.length,
  '| orphans:',
  orphans.length,
  '| unique ids:',
  ids.size,
);
