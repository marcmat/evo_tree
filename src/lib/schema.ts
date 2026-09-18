import { z } from 'zod';

const Localized = z.object({ pl: z.string(), en: z.string() });
const AudienceText = z.object({ kids: Localized, adults: Localized });

/** A single taxonomic group. Flat: children are linked via `parentId`. */
export const NodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  eras: z.array(z.string()).min(1),
  status: z.enum(['survived', 'extinct']).nullable(),
  icon: z.string().min(1),
  name: Localized,
  short: AudienceText,
  detail: AudienceText,
  examples: Localized.nullable(),
  extinctIn: Localized.nullable(),
});
export type EvoNode = z.infer<typeof NodeSchema>;
export const NodesSchema = z.array(NodeSchema);

export const EraSchema = z.object({
  name: Localized,
  color: z.string(),
  span: z.number().positive(),
});
export type Era = z.infer<typeof EraSchema>;
export const ErasSchema = z.record(z.string(), EraSchema);
export type Eras = z.infer<typeof ErasSchema>;

export const I18nStringsSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  kids: z.string(),
  adults: z.string(),
  livingOnly: z.string(),
  expand: z.string(),
  collapse: z.string(),
  expandAll: z.string(),
  collapseAll: z.string(),
  search: z.string(),
  today: z.string(),
  extinct: z.string(),
  extinctIn: z.string(),
  eraRange: z.string(),
  timelineTitle: z.string(),
  timelineOld: z.string(),
  timelineNow: z.string(),
  skipToContent: z.string(),
  noResults: z.string(),
  lifespanHint: z.string(),
  footer: z.string(),
});
export type I18nStrings = z.infer<typeof I18nStringsSchema>;
export const I18nSchema = z.object({ pl: I18nStringsSchema, en: I18nStringsSchema });
export type I18n = z.infer<typeof I18nSchema>;
