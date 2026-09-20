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
    /** The derived trait that makes this its own branch. Where a group has siblings
        this is the contrast that split them — one temporal fenestra in Synapsida
        against two in Sauropsida — so it gets its own callout rather than being
        buried mid-paragraph in `detail`. */
    distinction: AudienceText,
    /** Representative members, shown at the foot of the detail panel. Required:
        every clade has something recognisable to point at, a fossil genus if not
        a living animal, and an empty list would leave the panel trailing off. */
    examples: Localized,
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
    /** A single point on the scale. A drawn-out crisis is pinned to the pulse that
        matters for the groups shown — the Late Devonian sits at Hangenberg, not
        Kellwasser — and its duration is carried by the description instead. */
    ma: z.number().min(0),
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
  distinction: z.string(),
  examples: z.string(),
});
export type I18nStrings = z.infer<typeof I18nStringsSchema>;
export const I18nSchema = z.object({ pl: I18nStringsSchema, en: I18nStringsSchema });
export type I18n = z.infer<typeof I18nSchema>;
