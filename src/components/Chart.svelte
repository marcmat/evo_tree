<script lang="ts">
  import { tick } from 'svelte';
  import { eras as ERAS, byId, children, eventById, roots } from '../lib/data';
  import { ageToPct, boundariesMa, eraOrder, maToFrac } from '../lib/eras';
  import { isVisible } from '../lib/filter';
  import { strings } from '../lib/i18n';
  import { toggleOpen, ui } from '../lib/state.svelte';
  import RangeNode from './RangeNode.svelte';
  import TimelineEvents from './TimelineEvents.svelte';

  const kids = (id: string) => children(id);
  const t = $derived(strings(ui.lang));
  const visibleRoots = $derived(roots.filter((r) => isVisible(r, kids, ui.livingOnly, ui.query)));
  // When a lineage is hovered/selected the rows dim; fade the connectors with them.
  const activeId = $derived(ui.hoveredId ?? ui.selectedId);
  // The transient vertical marker line: only while an event marker is
  // hovered/focused/pinned, so it doesn't compete visually with the
  // always-on lineage connectors.
  const activeEventId = $derived(ui.hoveredEventId ?? ui.pinnedEventId);
  const activeEvent = $derived(activeEventId ? (eventById.get(activeEventId) ?? null) : null);
  const eventLineLeft = $derived(
    activeEvent
      ? `calc(var(--inset) + ${maToFrac(activeEvent.ma).toFixed(4)} * (100% - var(--inset)))`
      : '',
  );

  const segments = eraOrder.map((k) => ({ key: k, span: ERAS[k].startMa - ERAS[k].endMa, ...ERAS[k] }));
  const oldest = boundariesMa[0];
  const ticks = boundariesMa.map((age) => {
    const pct = ageToPct(age);
    return { age, pct, pos: pct <= 1 ? 'start' : pct >= 99 ? 'end' : 'mid' };
  });
  // Locale-aware age formatting (e.g. Polish uses a space as thousands separator).
  const nf = $derived(new Intl.NumberFormat(ui.lang));
  // Vertical gridlines at every period boundary (drawn behind each row's bar).
  const gridlines = boundariesMa
    .slice(1, -1)
    .map((age) => {
      const frac = (ageToPct(age) / 100).toFixed(5);
      const pos = `calc(var(--inset) + ${frac} * (100% - var(--inset)))`;
      const c = 'rgb(100 116 139 / 0.13)';
      return `linear-gradient(90deg, transparent ${pos}, ${c} ${pos}, ${c} calc(${pos} + 1px), transparent calc(${pos} + 1px))`;
    })
    .join(', ');

  let el = $state<HTMLElement>();
  function names(): HTMLButtonElement[] {
    return el ? Array.from(el.querySelectorAll<HTMLButtonElement>('.name')) : [];
  }
  function focusAt(list: HTMLButtonElement[], i: number): void {
    list[Math.max(0, Math.min(list.length - 1, i))]?.focus();
  }
  async function onKeydown(e: KeyboardEvent): Promise<void> {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('name')) return;
    const list = names();
    const idx = list.indexOf(target as HTMLButtonElement);
    const id = target.dataset.id;
    if (!id) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusAt(list, idx + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusAt(list, idx - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(list, 0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(list, list.length - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!ui.openIds.has(id)) {
          toggleOpen(id);
          await tick();
        } else {
          focusAt(names(), names().indexOf(target as HTMLButtonElement) + 1);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (ui.openIds.has(id)) toggleOpen(id);
        break;
    }
  }

  // Parent→child connectors: measured from the laid-out bars so they stay
  // correct across expand/collapse, filtering, language and resize.
  let links = $state<string[]>([]);
  function measure(): void {
    if (!el) return;
    const base = el.getBoundingClientRect();
    const pts = new Map<string, { x: number; y: number; depth: number }>();
    for (const w of el.querySelectorAll<HTMLElement>('.wrap[data-id]')) {
      const id = w.dataset.id;
      const bar = w.querySelector<HTMLElement>(':scope > .row > .bar');
      if (!id || !bar) continue;
      const r = bar.getBoundingClientRect();
      const depth = Number(w.getAttribute('aria-level') ?? 1) - 1;
      pts.set(id, { x: r.left - base.left, y: r.top - base.top + r.height / 2, depth });
    }

    const rail = 4;
    const gap = 12; // desired gap: parent-bar → spine, and between adjacent spines
    const cr = 5;   // corner radius (same curve at top and bottom of each connector)
    const f = (n: number) => n.toFixed(1);

    // Group visible children by parent (store IDs so we can look up spine positions).
    const byParent = new Map<string, string[]>();
    for (const [id] of pts) {
      const pid = byId.get(id)?.parentId;
      if (!pid || !pts.has(pid)) continue;
      const arr = byParent.get(pid) ?? [];
      arr.push(id);
      byParent.set(pid, arr);
    }

    // Assign spine X for each parent, deepest-first so child spines are resolved
    // before their parent. Rule: a parent's spine must be at least `gap` to the LEFT
    // of any direct child's spine — this produces a uniform step cascade when parent
    // and child bars start at the same era (e.g. Tetrapodomorpha → Temnospondyli).
    const spineX = new Map<string, number>();
    const sortedParents = [...byParent.keys()].sort(
      (a, b) => (pts.get(b)?.depth ?? 0) - (pts.get(a)?.depth ?? 0),
    );
    for (const pid of sortedParents) {
      const pp = pts.get(pid);
      if (!pp) continue;
      let bx = Math.max(rail, pp.x - gap);
      const childSpines = (byParent.get(pid) ?? [])
        .map((cid) => spineX.get(cid))
        .filter((x): x is number => x !== undefined);
      if (childSpines.length > 0) {
        const leftmostChild = Math.min(...childSpines);
        if (bx >= leftmostChild) bx = leftmostChild - gap;
        bx = Math.max(rail, bx);
      }
      spineX.set(pid, bx);
    }

    // Build SVG paths — one spine per parent, one rounded tick per child.
    const segs: string[] = [];
    for (const [pid, childIds] of byParent) {
      const pp = pts.get(pid);
      const bx = spineX.get(pid);
      if (!pp || bx === undefined) continue;

      const kids = childIds
        .map((id) => pts.get(id)!)
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);
      const lastY = kids[kids.length - 1].y;

      // Elbow: parent bar → top-left curve → spine down to where the last tick's curve begins.
      segs.push(
        `M${f(pp.x)} ${f(pp.y)} H${f(bx + cr)} Q${f(bx)} ${f(pp.y)} ${f(bx)} ${f(pp.y + cr)} V${f(lastY - cr)}`,
      );
      // Each child gets a rounded bottom-left tick (mirrors the top-left curve).
      for (const c of kids) {
        segs.push(
          `M${f(bx)} ${f(c.y - cr)} Q${f(bx)} ${f(c.y)} ${f(bx + cr)} ${f(c.y)} H${f(c.x)}`,
        );
      }
    }

    links = segs;
  }

  // Re-measure after any layout-affecting state change (post-DOM update).
  // selectedId matters: opening/closing a detail panel shifts row positions
  // even when the total height stays the same (one panel closes, another opens).
  $effect(() => {
    void ui.openIds.size;
    void ui.livingOnly;
    void ui.query;
    void ui.lang;
    void ui.audience;
    void ui.selectedId;
    tick().then(measure);
  });

  // Re-measure on container resize (window, font load, scrollbar).
  $effect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<section class="chart container" style="--grid:{gridlines}" aria-label={t.timelineTitle}>
  <div class="scroll">
    <div class="canvas">
      <!-- Geological period bands + Ma axis (sticky), full width -->
      <div class="head">
        <span class="cap">{t.timelineTitle}</span>
        <div class="bands">
          {#each segments as s (s.key)}
            <div class="band" style="flex:{s.span} 1 0; background:{s.color}" title={s.name[ui.lang]}>
              {s.name[ui.lang]}
            </div>
          {/each}
        </div>
        <TimelineEvents />
        <div class="axis" aria-hidden="true">
          {#each ticks as tk (tk.age)}
            <span class="tick {tk.pos}" style="left:{tk.pct.toFixed(2)}%">
              {tk.age === oldest ? `${nf.format(tk.age)} Ma` : nf.format(tk.age)}
            </span>
          {/each}
        </div>
      </div>

      <div
        class="rows"
        role="tree"
        tabindex="-1"
        aria-label={t.title}
        bind:this={el}
        onkeydown={onKeydown}
        onmouseleave={() => (ui.hoveredId = null)}
      >
        <svg class="links" class:faded={activeId} aria-hidden="true">
          {#each links as d (d)}
            <path {d} />
          {/each}
        </svg>
        {#if activeEvent}
          <div class="event-line {activeEvent.kind}" style="left:{eventLineLeft}" aria-hidden="true"></div>
        {/if}
        {#if visibleRoots.length === 0}
          <p class="empty" role="status">{t.noResults}</p>
        {:else}
          {#each visibleRoots as root (root.id)}
            <RangeNode node={root} depth={0} />
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <p class="sr-only">
    {t.timelineTitle}: {segments.map((s) => s.name[ui.lang]).join(', ')}.
  </p>
</section>

<style>
  .chart {
    /* Thin left rail reserved for the phylogram connectors. */
    --inset: 16px;
    margin-block: var(--space-4);
    padding: var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: 0 15px 35px rgb(0 0 0 / 0.6);
  }
  .scroll {
    overflow-x: auto;
  }
  .canvas {
    min-width: 720px;
  }

  /* Sticky header */
  .head {
    position: sticky;
    top: 0;
    z-index: 5;
    padding-bottom: var(--space-2);
    margin-bottom: var(--space-1);
    background: var(--bg-surface);
  }
  .cap {
    display: block;
    margin-bottom: var(--space-1);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-secondary);
  }
  .bands {
    display: flex;
    height: 26px;
    /* Start at the inset so period boundaries line up with the bars. */
    margin-left: var(--inset);
    width: calc(100% - var(--inset));
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
  }
  .band {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 0 4px;
    overflow: hidden;
    font-size: 0.6rem;
    font-weight: var(--fw-bold);
    color: #fff;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
  }
  .band + .band {
    border-left: 1px solid rgb(0 0 0 / 0.25);
  }
  .axis {
    position: relative;
    height: 14px;
    margin-top: 4px;
    margin-left: var(--inset);
    width: calc(100% - var(--inset));
  }
  .tick {
    position: absolute;
    top: 3px;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .tick::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 0;
    width: 1px;
    height: 4px;
    background: var(--border-medium);
  }
  .tick.mid {
    transform: translateX(-50%);
  }
  .tick.mid::before {
    left: 50%;
  }
  .tick.end {
    transform: translateX(-100%);
  }
  .tick.end::before {
    left: auto;
    right: 0;
  }

  .rows {
    position: relative;
  }
  /* Parent→child lineage connectors, drawn behind the bars. */
  .links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: visible;
    transition: opacity var(--timing-normal) ease;
  }
  /* Recede while a lineage is highlighted so the bars stay the focus. */
  .links.faded {
    opacity: 0.3;
  }
  .links path {
    fill: none;
    /* A cool steel-blue, distinct from the faint neutral period gridlines. */
    stroke: rgb(125 174 219 / 0.55);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  /* Transient marker line: only rendered while a timeline event is active
     (hovered/focused/pinned). Deliberately z-index: 0, the same paint level
     as .links (also 0) and the bars (z-index: auto, i.e. also level 0) — at
     that shared level, paint order follows DOM order, and this element sits
     right after .links and before all bars in markup, giving exactly
     "below bars, above connectors" without out-ranking the bars entirely. */
  .event-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    pointer-events: none;
    z-index: 0;
  }
  .event-line.extinction {
    background: var(--accent-extinct);
    opacity: 0.5;
  }
  .event-line.milestone {
    background: var(--accent-node);
    opacity: 0.5;
  }

  .empty {
    padding: var(--space-6) var(--space-2);
    color: var(--text-secondary);
    text-align: center;
  }

  @media (max-width: 700px) {
    .chart {
      padding: var(--space-2);
    }
    .canvas {
      min-width: 620px;
    }
    .band {
      font-size: 0;
      padding: 0;
    }
    .axis {
      display: none;
    }
  }
</style>
