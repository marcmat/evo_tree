<script lang="ts">
  import { events, eventById } from '../lib/data';
  import { maToFrac } from '../lib/eras';
  import { strings } from '../lib/i18n';
  import type { EvoEvent } from '../lib/schema';
  import { selectEvent, ui } from '../lib/state.svelte';

  const t = $derived(strings(ui.lang));
  const nf = $derived(new Intl.NumberFormat(ui.lang));

  // Oldest -> present, left to right, matching the axis below. The two kinds sit
  // in separate vertical lanes (CSS `top`, by `.kind`) purely so the 444 Ma
  // collision (end-Ordovician extinction vs. first jaws) stays legible and both
  // remain independently clickable, instead of shrinking either hit area.
  const sorted = $derived([...events].sort((a, b) => b.ma - a.ma));

  // Hover (incl. keyboard focus) beats a pinned/clicked marker — same pattern as
  // ui.hoveredId ?? ui.selectedId used for node rows.
  const activeId = $derived(ui.hoveredEventId ?? ui.pinnedEventId);
  const active = $derived(activeId ? (eventById.get(activeId) ?? null) : null);

  function leftFor(ma: number): string {
    return `calc(var(--inset) + ${maToFrac(ma).toFixed(4)} * (100% - var(--inset)))`;
  }
  /** Width of the bracket drawn for a protracted event, from its older to its
      younger edge — same inset-mapped arithmetic the range bars use. */
  function widthBetween(fromMa: number, toMa: number): string {
    return `calc(${(maToFrac(toMa) - maToFrac(fromMa)).toFixed(4)} * (100% - var(--inset)))`;
  }
  function kindLabel(kind: EvoEvent['kind']): string {
    return kind === 'extinction' ? t.massExtinction : t.milestone;
  }
  function ariaLabelFor(ev: EvoEvent): string {
    return `${ev.name[ui.lang]}, ${nf.format(ev.ma)} ${t.maAgo}, ${kindLabel(ev.kind)}`;
  }
  function setHover(id: string | null): void {
    ui.hoveredEventId = id;
  }
  /** Split on the first space so every badge renders as exactly two lines —
      deterministic, unlike width-driven wrapping, which would leave short
      labels ("Pierwszy lot") on one line while long ones wrapped to two. */
  function badgeLines(text: string): [string, string] {
    const i = text.indexOf(' ');
    return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
  }
</script>

<div class="events" aria-label={t.eventsTitle}>
  {#each sorted as ev (ev.id)}
    {@const lines = badgeLines(ev.shortName[ui.lang])}
    {#if ev.endMa !== null}
      <span
        class="span {ev.kind}"
        class:active={activeId === ev.id}
        style="left:{leftFor(ev.ma)}; width:{widthBetween(ev.ma, ev.endMa)}"
        aria-hidden="true"
      ></span>
    {/if}
    <button
      type="button"
      class="marker {ev.kind}"
      style="left:{leftFor(ev.ma)}"
      aria-label={ariaLabelFor(ev)}
      aria-expanded={activeId === ev.id}
      aria-controls={`event-tip-${ev.id}`}
      onmouseenter={() => setHover(ev.id)}
      onmouseleave={() => setHover(null)}
      onfocus={() => setHover(ev.id)}
      onblur={() => setHover(null)}
      onclick={() => selectEvent(ev.id)}
    >
      <span class="glyph" aria-hidden="true">{ev.kind === 'extinction' ? '▼' : '●'}</span>
      <span class="tag" aria-hidden="true">
        <span>{lines[0]}</span>
        {#if lines[1]}<span>{lines[1]}</span>{/if}
      </span>
    </button>
  {/each}

  {#if active}
    <div
      class="tooltip"
      id={`event-tip-${active.id}`}
      style="--tip-left:{leftFor(active.ma)}"
    >
      <p class="tip-head">
        <strong>{active.name[ui.lang]}</strong>
        <span class="badge {active.kind}">{kindLabel(active.kind)}</span>
      </p>
      <p class="tip-body">{active.detail[ui.audience][ui.lang]}</p>
      {#if active.severity !== null}
        <p class="tip-meta">{t.speciesLost} {active.severity}%</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .events {
    position: relative;
    height: 78px;
    margin-top: 2px;
  }

  /* The glyph — not the whole chip — marks the exact point in time, so the
     button is shifted by half a glyph box rather than half its own width;
     the name then reads rightwards from that point without moving it. */
  .marker {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    box-sizing: border-box;
    min-height: 24px; /* WCAG 2.2 pointer target — a floor, the badge may be taller */
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transform: translateX(-12px);
    z-index: 2;
  }
  /* Bracket spanning a protracted event, drawn under the button (z-index 1 vs 2)
     and non-interactive, so it never steals a click from the marker it belongs to.
     Sits at the vertical centre of its lane's 24px glyph box. */
  .span {
    position: absolute;
    height: 2px;
    pointer-events: none;
    background: currentColor;
    opacity: 0.45;
    z-index: 1;
    transition: opacity var(--timing-fast) ease;
  }
  .span.active {
    opacity: 0.9;
  }
  /* Tick closing the younger edge — marks where the crisis actually ended. */
  .span::after {
    content: '';
    position: absolute;
    top: -3px;
    right: 0;
    width: 2px;
    height: 8px;
    background: currentColor;
  }
  .span.extinction {
    top: 11px;
    color: var(--accent-extinct);
  }
  .span.milestone {
    top: 51px;
    color: var(--accent-node);
  }

  .marker.extinction {
    top: 0;
  }
  .marker.milestone {
    top: 40px;
  }
  .marker:hover,
  .marker:focus-visible {
    background: rgb(148 163 184 / 0.18);
  }
  .marker:focus-visible {
    outline: 2px solid var(--accent-node);
    outline-offset: 1px;
  }
  .glyph {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    /* Holds the 24x24 target on its own, so hiding .tag on narrow
       viewports never shrinks the hit area below the WCAG minimum. */
    width: 24px;
    height: 24px;
    font-size: 11px;
    line-height: 1;
    pointer-events: none;
  }
  .tag {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2px 7px;
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    line-height: 1.25;
    white-space: nowrap;
    pointer-events: none;
    border-radius: var(--radius-md);
    /* Darkened rather than tinted, so the accent text keeps its contrast
       instead of being washed out — same reasoning as the tooltip badge. */
    background: rgb(0 0 0 / 0.3);
  }
  .marker.extinction .glyph,
  .marker.extinction .tag {
    color: var(--accent-extinct);
  }
  .marker.milestone .glyph,
  .marker.milestone .tag {
    color: var(--accent-node);
  }
  .marker.extinction .tag {
    border: 1px solid rgb(251 146 60 / 0.35);
  }
  .marker.milestone .tag {
    border: 1px solid rgb(56 189 248 / 0.35);
  }
  /* Active marker reads as pressed, since the chip is now a visible object. */
  .marker[aria-expanded='true'] .tag {
    background: rgb(0 0 0 / 0.55);
  }

  /* Opens downward, clamped horizontally so it never spills past the chart
     edges — same clamp() technique DetailPanel uses for its own placement.
     Positioned (not static) so it always paints above the axis/bands below it,
     regardless of DOM order; absolute so it doesn't push the axis down. */
  .tooltip {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 3;
    width: min(300px, calc(100% - 8px));
    margin-top: var(--space-2);
    margin-left: clamp(0px, var(--tip-left, 0%), calc(100% - min(300px, 100%)));
    padding: var(--space-3);
    background: var(--bg-surface2);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  }
  .tip-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-2);
    font-size: var(--fs-sm);
    color: var(--text-primary);
  }
  .badge {
    padding: 1px 8px;
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    white-space: nowrap;
    border-radius: var(--radius-pill);
    /* Darken (not tint) the surface behind the accent text — keeps contrast
       comfortably above 4.5:1 instead of washing it out with a colour tint. */
    background: rgb(0 0 0 / 0.3);
  }
  .badge.extinction {
    color: var(--accent-extinct);
    border: 1px solid rgb(251 146 60 / 0.4);
  }
  .badge.milestone {
    color: var(--accent-node);
    border: 1px solid rgb(56 189 248 / 0.4);
  }
  .tip-body {
    margin: 0 0 var(--space-2);
    font-size: var(--fs-sm);
    line-height: var(--lh-base);
    color: var(--text-primary);
  }
  .tip-meta {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }

  /* Measured, not guessed: with two-line badges the tightest pair in a lane is
     end-Permian → end-Triassic (252 vs 201 Ma). Its gap is 34px at a 1440px
     viewport, 15px at 1240px, and reaches zero near 1080px. Cut over at 1240px
     and drop to glyph-only below it — the name stays reachable through the
     tooltip and the aria-label, and the lane shrinks back to one row of glyphs. */
  @media (max-width: 1240px) {
    .tag {
      display: none;
    }
    .events {
      height: 64px;
    }
  }
  @media (max-width: 700px) {
    .events {
      display: none;
    }
  }
</style>
