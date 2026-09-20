import { describe, expect, it } from 'vitest';
import eventsJson from '../src/data/events.json';
import nodesJson from '../src/data/nodes.json';
import { totalMa } from '../src/lib/eras';
import { EventsSchema, NodesSchema } from '../src/lib/schema';

describe('events.json validates against the schema', () => {
  it('parses', () => {
    expect(() => EventsSchema.parse(eventsJson)).not.toThrow();
  });
});

describe('event integrity', () => {
  const events = EventsSchema.parse(eventsJson);
  const nodes = NodesSchema.parse(nodesJson);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  it('has no duplicate ids', () => {
    const ids = new Set(events.map((e) => e.id));
    expect(ids.size).toBe(events.length);
  });

  it('ma is within [0, totalMa] for every event', () => {
    for (const e of events) {
      expect(e.ma).toBeGreaterThanOrEqual(0);
      expect(e.ma).toBeLessThanOrEqual(totalMa);
    }
  });

  it('extinctions carry a severity percentage; milestones do not', () => {
    for (const e of events) {
      if (e.kind === 'extinction') expect(typeof e.severity).toBe('number');
      else expect(e.severity).toBeNull();
    }
  });

  it('milestones anchor to a real node and match its startMa exactly', () => {
    const milestones = events.filter((e) => e.kind === 'milestone');
    expect(milestones.length).toBeGreaterThan(0);
    for (const e of milestones) {
      expect(e.anchorNodeId).not.toBeNull();
      const node = e.anchorNodeId ? nodeById.get(e.anchorNodeId) : undefined;
      expect(node, `anchorNodeId "${e.anchorNodeId}" for event "${e.id}" must exist`).toBeDefined();
      expect(
        node?.startMa,
        `event "${e.id}" (${e.ma} Ma) must match ${e.anchorNodeId}.startMa exactly`,
      ).toBe(e.ma);
    }
  });

  it('extinctions have no anchor node', () => {
    for (const e of events) {
      if (e.kind === 'extinction') expect(e.anchorNodeId).toBeNull();
    }
  });

  // The badge renders on two lines, split at the first space (see badgeLines in
  // TimelineEvents.svelte), so its width is set by the LONGER of the two lines —
  // not the whole string. Markers in a lane sit as little as ~108px apart at a
  // 1246px canvas, so an over-long line would silently overlap its neighbour.
  const MAX_LINE_CHARS = 12;
  const splitBadge = (text: string): [string, string] => {
    const i = text.indexOf(' ');
    return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
  };

  it('neither badge line is too wide for the time scale, in either language', () => {
    const tooWide = events
      .flatMap((e) => [
        { id: e.id, lang: 'pl', text: e.shortName.pl },
        { id: e.id, lang: 'en', text: e.shortName.en },
      ])
      .flatMap(({ id, lang, text }) =>
        splitBadge(text)
          .filter((line) => line.length > MAX_LINE_CHARS)
          .map((line) => `${id}.${lang}: "${line}" (${line.length} chars)`),
      );
    expect(tooWide).toEqual([]);
  });

  it('every badge splits into two non-empty lines', () => {
    for (const e of events) {
      for (const lang of ['pl', 'en'] as const) {
        const [first, second] = splitBadge(e.shortName[lang]);
        expect(first.length, `${e.id}.${lang} first line`).toBeGreaterThan(0);
        expect(second.length, `${e.id}.${lang} needs a second line`).toBeGreaterThan(0);
      }
    }
  });

  // The Late Devonian ran in pulses across ~13 Myr. The marker is pinned to the
  // terminal Hangenberg pulse rather than the opening Kellwasser one, because that
  // is where the placoderms actually go; anchoring it at 372 Ma left the scale
  // disagreeing with where their bar ends. The duration lives in the description.
  it('the Late Devonian marker lands exactly where the placoderms end', () => {
    const devonian = events.find((e) => e.id === 'late-devonian');
    const placoderms = nodes.find((n) => n.id === 'placodermi');
    expect(devonian?.ma).toBe(placoderms?.endMa);
  });

  // 359 rather than the more commonly cited 372 for the Late Devonian: see the
  // Hangenberg reasoning above. The other four are the standard boundary dates.
  it('the Big Five mass extinctions are all present with the expected dates', () => {
    const extinctions = events.filter((e) => e.kind === 'extinction');
    const byMa = new Set(extinctions.map((e) => e.ma));
    expect(byMa).toEqual(new Set([444, 359, 252, 201, 66]));
    expect(extinctions).toHaveLength(5);
  });
});
