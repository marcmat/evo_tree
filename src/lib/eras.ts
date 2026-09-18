import { eras } from './data';

export const eraOrder: string[] = Object.keys(eras);
export const totalMa: number = eraOrder.reduce((sum, k) => sum + eras[k].span, 0);

/** Cumulative Ma offset of every era, measured from the oldest edge (0) to present (totalMa). */
export const eraOffset: Record<string, { start: number; end: number }> = (() => {
  const out: Record<string, { start: number; end: number }> = {};
  let acc = 0;
  for (const k of eraOrder) {
    out[k] = { start: acc, end: acc + eras[k].span };
    acc += eras[k].span;
  }
  return out;
})();

/** Period boundaries in Ma, oldest -> present, e.g. [538, 485, 443, …, 0]. */
export const boundariesMa: number[] = (() => {
  const out = [totalMa];
  let acc = 0;
  for (const k of eraOrder) {
    acc += eras[k].span;
    out.push(totalMa - acc);
  }
  return out;
})();

/** Horizontal position (0–100 %) on the timeline for a given age in Ma. */
export function ageToPct(age: number): number {
  return ((totalMa - age) / totalMa) * 100;
}
