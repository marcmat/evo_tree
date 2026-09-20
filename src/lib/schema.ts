import { z } from 'zod';

const Localized = z.object({ pl: z.string(), en: z.string() });
const AudienceText = z.object({ kids: Localized, adults: Localized });

/** A single taxonomic group. Flat: children are linked via `parentId`. */
export const NodeSchema = z
  .object({
    id: z.string().min(1),
    parentId: z.string().nullable(),
    startMa: z.number().min(0),
    endMa: z.number().min(0),
    status: z.enum(['survived', 'extinct']).nullable(),
    icon: z.string().min(1),
    name: Localized,
    short: AudienceText,
    detail: AudienceText,
    examples: Localized.nullable(),
  })
  .refine((n) => n.startMa > n.endMa, {
    message: 'startMa must be after endMa (a range cannot be empty or inverted)',
  });
export type EvoNode = z.infer<typeof NodeSchema>;
export const NodesSchema = z.array(NodeSchema);

/** A mass extinction or evolutionary milestone plotted on the time axis. */
export const EventSchema = z
  .object({
    id: z.string().min(1),
    /** When it happened — for a drawn-out crisis, when it began (the older edge). */
    ma: z.number().min(0),
    /** Younger edge of a protracted event, e.g. the Late Devonian ran 372→359 Ma
        across two pulses. null for events short enough to read as a single moment. */
    endMa: z.number().min(0).nullable(),
    kind: z.enum(['extinction', 'milestone']),
    severity: z.number().min(0).max(100).nullable(),
    /** Node whose startMa this milestone must match; null for extinctions. */
    anchorNodeId: z.string().nullable(),
    /** Badge text shown inline on the time scale — must stay short enough that
        neighbouring markers in the same lane do not overlap (see events.test.ts). */
    shortName: Localized,
    name: Localized,
    short: AudienceText,
    detail: AudienceText,
  })
  .refine((e) => (e.kind === 'extinction' ? typeof e.severity === 'number' : e.severity === null), {
    message: 'severity must be a number for extinctions and null for milestones',
  })
  .refine((e) => e.endMa === null || e.endMa < e.ma, {
    message: 'endMa is the younger edge, so it must be smaller than ma',
  });
export type EvoEvent = z.infer<typeof EventSchema>;
export const EventsSchema = z.array(EventSchema);

export const EraSchema = z.object({
  name: Localized,
  color: z.string(),
  startMa: z.number().positive(),
  endMa: z.number().min(0),
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
  eventsTitle: z.string(),
  massExtinction: z.string(),
  milestone: z.string(),
  speciesLost: z.string(),
  maAgo: z.string(),
});
export type I18nStrings = z.infer<typeof I18nStringsSchema>;
export const I18nSchema = z.object({ pl: I18nStringsSchema, en: I18nStringsSchema });
export type I18n = z.infer<typeof I18nSchema>;
