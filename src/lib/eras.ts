import { eras } from './data';

export const eraOrder: string[] = Object.keys(eras);

/** Oldest edge of the timeline, in Ma. Every era's startMa must chain up to this. */
export const totalMa: number = Math.max(...eraOrder.map((k) => eras[k].startMa));

/** Period boundaries in Ma, oldest -> present, e.g. [538, 485, 443, …, 0]. */
export const boundariesMa: number[] = [
  ...eraOrder.map((k) => eras[k].startMa),
  eras[eraOrder[eraOrder.length - 1]].endMa,
];

/** Horizontal position (0–100 %) on the timeline for a given age in Ma. */
export function ageToPct(age: number): number {
  return ((totalMa - age) / totalMa) * 100;
}

/** Fraction (0–1) of the timeline for a given age in Ma — the raw form ageToPct scales to %. */
export function maToFrac(ma: number): number {
  return (totalMa - ma) / totalMa;
}

/** Key of the era containing a given point in Ma. `ma === 0` resolves to the youngest era. */
export function eraAtMa(ma: number): string {
  if (ma <= 0) return eraOrder[eraOrder.length - 1];
  const found = eraOrder.find((k) => ma <= eras[k].startMa && ma > eras[k].endMa);
  return found ?? eraOrder[eraOrder.length - 1];
}

/** Era keys spanned by a [startMa, endMa] range, oldest -> youngest, for gradients/labels. */
export function erasBetween(startMa: number, endMa: number): string[] {
  return eraOrder.filter((k) => eras[k].startMa > endMa && eras[k].endMa < startMa);
}
