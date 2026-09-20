// One-off migration: era-index model (eras.json `span`, node `eras: [first, last]`)
// -> explicit absolute dates in Ma (eras.json `startMa`/`endMa`, node `startMa`/`endMa`).
//
// Purely mechanical: derives every date from the *existing* era boundaries, so the
// rendered output is pixel-identical to before. Real first/last-occurrence dates are
// filled in by hand afterwards (see the plan) — this script only removes the
// era-index indirection.
import { readFile, writeFile } from 'node:fs/promises';

const dataDir = new URL('../src/data/', import.meta.url);
const erasUrl = new URL('eras.json', dataDir);
const nodesUrl = new URL('nodes.json', dataDir);

const eras = JSON.parse(await readFile(erasUrl, 'utf8'));
const nodes = JSON.parse(await readFile(nodesUrl, 'utf8'));

const eraOrder = Object.keys(eras);

/** Cumulative Ma boundaries, oldest -> present, e.g. { kambr: {startMa: 538, endMa: 485}, ... }. */
const boundaries = {};
{
  let acc = 0;
  const totalMa = eraOrder.reduce((sum, k) => sum + eras[k].span, 0);
  for (const k of eraOrder) {
    const startMa = totalMa - acc;
    acc += eras[k].span;
    const endMa = totalMa - acc;
    boundaries[k] = { startMa, endMa };
  }
}

const newEras = {};
for (const k of eraOrder) {
  const { span, ...rest } = eras[k];
  newEras[k] = { ...rest, startMa: boundaries[k].startMa, endMa: boundaries[k].endMa };
}

const newNodes = nodes.map((node) => {
  const { eras: nodeEras, ...rest } = node;
  const first = nodeEras[0];
  const last = nodeEras[nodeEras.length - 1];
  return { ...rest, startMa: boundaries[first].startMa, endMa: boundaries[last].endMa };
});

await writeFile(erasUrl, `${JSON.stringify(newEras, null, 2)}\n`);
await writeFile(nodesUrl, `${JSON.stringify(newNodes, null, 2)}\n`);

console.log('eras.json and nodes.json migrated: eras/span -> startMa/endMa');
