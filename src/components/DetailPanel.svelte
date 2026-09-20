<script lang="ts">
  import { eras as ERAS } from '../lib/data';
  import { eraAtMa, erasBetween } from '../lib/eras';
  import { strings } from '../lib/i18n';
  import type { EvoNode } from '../lib/schema';
  import { ui } from '../lib/state.svelte';

  let { node, startFrac = 0 }: { node: EvoNode; startFrac?: number } = $props();

  const t = $derived(strings(ui.lang));
  const text = $derived(node.detail[ui.audience][ui.lang]);
  const nf = $derived(new Intl.NumberFormat(ui.lang));
  const eraNames = $derived(
    erasBetween(node.startMa, node.endMa)
      .map((k) => ERAS[k]?.name[ui.lang])
      .filter(Boolean)
      .join(' — '),
  );
  const rangeLabel = $derived(`${nf.format(node.startMa)}–${nf.format(node.endMa)} Ma`);
  const extinctLabel = $derived.by(() => {
    const eraName = ERAS[eraAtMa(node.endMa)]?.name[ui.lang];
    return `${nf.format(node.endMa)} Ma${eraName ? ` (${eraName})` : ''}`;
  });
</script>

<div
  class="detail"
  id={`detail-${node.id}`}
  style="--panel-left:calc(var(--inset) + {startFrac.toFixed(4)} * (100% - var(--inset)))"
>
  <svg class="icon" viewBox="0 0 64 64" aria-hidden="true"><use href={`#${node.icon}`} /></svg>
  <div class="body">
    <p>{text}</p>
    <div class="meta">
      <span>{t.eraRange} {rangeLabel}{eraNames ? ` (${eraNames})` : ''}</span>
      {#if node.status === 'extinct'}
        <span>{t.extinctIn} {extinctLabel}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .detail {
    /* Sit above the connector overlay and align under the clicked group,
       clamped so the card never spills past the chart's right edge. */
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    width: min(720px, 100%);
    margin: var(--space-2) 0 var(--space-3);
    margin-left: clamp(0px, var(--panel-left, 0%), calc(100% - min(720px, 100%)));
    padding: var(--space-4);
    background: var(--bg-surface2);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  }
  .icon {
    flex-shrink: 0;
    box-sizing: border-box;
    width: 72px;
    height: 72px;
    padding: 12px;
    color: var(--accent-node);
    background: rgb(56 189 248 / 0.12);
    border: 1px solid rgb(56 189 248 / 0.25);
    border-radius: 50%;
  }
  .body {
    flex: 1;
    min-width: 180px;
  }
  .body p {
    margin: 0 0 var(--space-3);
    font-size: var(--fs-sm);
    line-height: var(--lh-base);
    color: var(--text-primary);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: var(--fs-xs);
  }
  .meta span {
    padding: 2px 10px;
    color: var(--text-secondary);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-pill);
  }
  @media (max-width: 700px) {
    .detail {
      width: 100%;
      margin-left: 0;
    }
  }
</style>
