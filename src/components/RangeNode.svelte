<script lang="ts">
  import { eras as ERAS, children, pathIds } from '../lib/data';
  import { eraAtMa, eraEndpoints, maToFrac, totalMa } from '../lib/eras';
  import { isAncestorOnly, isVisible } from '../lib/filter';
  import { strings } from '../lib/i18n';
  import type { EvoNode } from '../lib/schema';
  import { selectNode, toggleOpen, ui } from '../lib/state.svelte';
  import DetailPanel from './DetailPanel.svelte';
  import RangeNode from './RangeNode.svelte';

  let { node, depth }: { node: EvoNode; depth: number } = $props();

  const kids = (id: string) => children(id);
  const t = $derived(strings(ui.lang));

  const open = $derived(ui.openIds.has(node.id));
  const detailOpen = $derived(ui.selectedId === node.id);
  const ancestorOnly = $derived(isAncestorOnly(node, kids, ui.livingOnly));
  const visibleChildren = $derived(
    children(node.id).filter((c) => isVisible(c, kids, ui.livingOnly, ui.query)),
  );
  const hasChildren = $derived(visibleChildren.length > 0);

  // Range bar geometry as fractions (0–1) of the time axis, mapped into the
  // inset scale so a thin left rail is free for the phylogram connectors.
  const startFrac = $derived(maToFrac(node.startMa));
  const widthFrac = $derived(Math.max((node.startMa - node.endMa) / totalMa, 0.007));
  const barLeft = $derived(`calc(var(--inset) + ${startFrac.toFixed(4)} * (100% - var(--inset)))`);
  const barWidth = $derived(`calc(${widthFrac.toFixed(4)} * (100% - var(--inset)))`);
  const startEra = $derived(eraAtMa(node.startMa));
  const endEra = $derived(eraAtMa(node.endMa));
  const fill = $derived(
    startEra === endEra
      ? ERAS[startEra].color
      : `linear-gradient(90deg, ${ERAS[startEra].color}, ${ERAS[endEra].color})`,
  );
  // Locale-aware age formatting (Polish uses a space as thousands separator).
  const nf = $derived(new Intl.NumberFormat(ui.lang));
  const rangeLabel = $derived.by(() => {
    const eraNames = eraEndpoints(node.startMa, node.endMa)
      .map((k) => ERAS[k]?.name[ui.lang])
      .filter(Boolean)
      .join(' — ');
    const range = `${nf.format(node.startMa)}–${nf.format(node.endMa)} Ma`;
    return eraNames ? `${range} (${eraNames})` : range;
  });

  // Ancestor-path highlight (hover beats persistent selection).
  const activeId = $derived(ui.hoveredId ?? ui.selectedId);
  const path = $derived(activeId ? pathIds(activeId) : null);
  const onPath = $derived(path ? path.has(node.id) : false);
  const isCurrent = $derived(activeId === node.id);
  const dimmed = $derived(activeId !== null && !onPath);

  const shortTxt = $derived(node.short[ui.audience][ui.lang]);

  // The temporal range and survival status are encoded visually (bar position,
  // length, dot colour). Expose them as text so screen-reader users get the data.
  const statusText = $derived.by(() => {
    if (node.status === 'survived' && node.examples) return `${t.today} ${node.examples[ui.lang]}`;
    if (node.status === 'extinct') {
      const eraName = ERAS[eraAtMa(node.endMa)]?.name[ui.lang];
      return `${t.extinctIn} ${nf.format(node.endMa)} Ma${eraName ? ` (${eraName})` : ''}`;
    }
    return '';
  });
  const ariaLabel = $derived(
    [node.name[ui.lang], rangeLabel, statusText].filter(Boolean).join(', '),
  );

  const nameParts = $derived.by(() => {
    const text = node.name[ui.lang];
    const q = ui.query;
    if (!q) return [{ t: text, m: false }];
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return [{ t: text, m: false }];
    return [
      { t: text.slice(0, i), m: false },
      { t: text.slice(i, i + q.length), m: true },
      { t: text.slice(i + q.length), m: false },
    ];
  });
</script>

<div
  class="wrap"
  data-id={node.id}
  role="treeitem"
  aria-level={depth + 1}
  aria-expanded={hasChildren ? open : undefined}
  aria-selected={detailOpen}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="row"
    class:ancestor-only={ancestorOnly}
    class:on-path={onPath}
    class:is-current={isCurrent}
    class:dimmed
    title={shortTxt}
    onmouseenter={() => (ui.hoveredId = node.id)}
  >
    <div
      class="bar"
      class:extinct={node.status === 'extinct'}
      style="left:{barLeft}; width:{barWidth}; background:{fill}"
      title={rangeLabel}
    ></div>

    <div class="label" style="left:{barLeft}">
      {#if hasChildren}
        <button
          class="chevron"
          class:open
          aria-label={open ? t.collapse : t.expand}
          tabindex="-1"
          onclick={() => toggleOpen(node.id)}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2 L8 6 L4 10" /></svg>
        </button>
      {/if}

      {#if node.status}
        <span
          class="dot"
          class:survived={node.status === 'survived'}
          class:extinct={node.status === 'extinct'}
          aria-hidden="true"
        ></span>
      {/if}

      <button
        class="name"
        class:detail-open={detailOpen}
        data-id={node.id}
        tabindex={ui.focusedId === node.id ? 0 : -1}
        aria-label={ariaLabel}
        aria-expanded={detailOpen}
        aria-controls={`detail-${node.id}`}
        onfocus={() => (ui.focusedId = node.id)}
        onclick={() => selectNode(node.id)}
      >
        {#each nameParts as p (p.t + p.m)}{#if p.m}<mark>{p.t}</mark>{:else}{p.t}{/if}{/each}
      </button>
    </div>
  </div>

  {#if detailOpen}
    <DetailPanel {node} {startFrac} />
  {/if}

  {#if hasChildren && open}
    <div role="group">
      {#each visibleChildren as child (child.id)}
        <RangeNode node={child} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .row {
    position: relative;
    min-height: 32px;
    background-image: var(--grid);
    border-radius: var(--radius-sm);
    transition: opacity var(--timing-slow) ease;
  }
  /* Fading a whole row with opacity fades the label and its backdrop together,
     which compresses the contrast between them — a white name on a pale Cenozoic
     bar fell to 2.3:1. So the bar recedes on its own, and the name switches to a
     secondary colour read against the page rather than against the faded bar. */
  .row.dimmed .bar {
    opacity: 0.3;
  }
  .row.dimmed .name {
    color: var(--text-secondary);
    text-shadow: none;
  }
  .row.dimmed .chevron,
  .row.dimmed .dot {
    opacity: 0.45;
  }

  .bar {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 18px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.4);
    transition: box-shadow var(--timing-fast);
  }
  .bar.extinct {
    opacity: 0.9;
  }

  /* Label rides at the start of the bar; clicks pass through empty areas. */
  .label {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 5px;
    padding-left: 6px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 2;
  }
  .chevron,
  .name {
    pointer-events: auto;
  }

  .chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    padding: 0;
    color: #fff;
    background: rgb(0 0 0 / 0.25);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .chevron svg {
    transition: transform var(--timing-normal) ease;
    filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.6));
  }
  .chevron.open svg {
    transform: rotate(90deg);
  }

  .dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 1.5px rgb(0 0 0 / 0.35);
  }
  .dot.survived {
    background: var(--accent-survived);
  }
  .dot.extinct {
    background: var(--accent-extinct);
  }

  .name {
    /* Keep a focused name clear of the sticky toolbar + period header. */
    scroll-margin-top: 96px;
    display: inline-flex;
    align-items: center;
    min-height: 24px; /* WCAG 2.2 pointer target */
    padding: 2px 6px;
    font: var(--fw-bold) var(--fs-sm) / 1.2 var(--font-sans);
    color: #fff;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-shadow:
      0 1px 2px rgb(0 0 0 / 0.9),
      0 0 4px rgb(0 0 0 / 0.6);
    transition:
      background var(--timing-fast),
      box-shadow var(--timing-normal);
  }
  .name:hover {
    background: rgb(15 23 42 / 0.55);
  }
  .name:focus-visible {
    outline: 2px solid var(--accent-node);
    outline-offset: 1px;
  }
  .name.detail-open {
    background: rgb(15 23 42 / 0.7);
    box-shadow: 0 0 0 1px var(--accent-node);
  }
  .name mark {
    padding: 0 1px;
    color: inherit;
    background: rgb(251 191 36 / 0.5);
    border-radius: 2px;
  }
  .ancestor-only .name {
    font-style: italic;
    opacity: 0.75;
  }

  /* Path highlight */
  .row.on-path .bar {
    box-shadow:
      0 0 0 1px var(--accent-node),
      0 0 10px var(--highlight-path);
  }
  .row.on-path .name {
    background: rgb(15 23 42 / 0.55);
  }
  .row.is-current .bar {
    box-shadow:
      0 0 0 2px var(--accent-node),
      0 0 16px var(--highlight-current);
  }
  .row.is-current .name {
    background: rgb(15 23 42 / 0.7);
    border-color: var(--accent-node);
  }
</style>
