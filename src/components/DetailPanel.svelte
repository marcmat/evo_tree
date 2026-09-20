<script lang="ts">
  import { eras as ERAS, images } from '../lib/data';
  import { eraAtMa, eraEndpoints } from '../lib/eras';
  import { strings } from '../lib/i18n';
  import type { EvoNode } from '../lib/schema';
  import { ui } from '../lib/state.svelte';

  let { node, startFrac = 0 }: { node: EvoNode; startFrac?: number } = $props();

  const t = $derived(strings(ui.lang));
  const text = $derived(node.detail[ui.audience][ui.lang]);
  const nf = $derived(new Intl.NumberFormat(ui.lang));
  const eraNames = $derived(
    eraEndpoints(node.startMa, node.endMa)
      .map((k) => ERAS[k]?.name[ui.lang])
      .filter(Boolean)
      .join(' — '),
  );
  const rangeLabel = $derived(`${nf.format(node.startMa)}–${nf.format(node.endMa)} Ma`);
  // Not every group has a freely-licensed picture; those fall back to the sprite.
  const pic = $derived(images[node.id] ?? null);
  // Files live in public/, so the URL must carry Vite's base — the GitHub Pages
  // project site is served from /evo_tree/, where a root-absolute path 404s.
  const base = import.meta.env.BASE_URL;
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
  {#if pic}
    <figure class="pic">
      <img
        src={`${base}species/${pic.file}`}
        alt={pic.subject}
        width={pic.width}
        height={pic.height}
        loading="lazy"
        decoding="async"
      />
      <figcaption>
        {t.photoBy}
        {pic.author} ·
        <a href={pic.licenseUrl} target="_blank" rel="noopener noreferrer license">{pic.license}</a>
        ·
        <a href={pic.sourceUrl} target="_blank" rel="noopener noreferrer">{t.source}</a>
      </figcaption>
    </figure>
  {:else}
    <svg class="icon" viewBox="0 0 64 64" aria-hidden="true"><use href={`#${node.icon}`} /></svg>
  {/if}
  <div class="body">
    <p>{text}</p>
    <p class="distinction">
      <span class="label">{t.distinction}</span>
      {node.distinction[ui.audience][ui.lang]}
    </p>
    <div class="meta">
      <span>{t.eraRange} {rangeLabel}{eraNames ? ` (${eraNames})` : ''}</span>
      {#if node.status === 'extinct'}
        <span>{t.extinctIn} {extinctLabel}</span>
      {/if}
    </div>

    <p class="examples">
      <span class="label">{t.examples}</span>
      {node.examples[ui.lang]}
    </p>
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

  .pic {
    flex-shrink: 0;
    width: 160px;
    margin: 0;
  }
  .pic img {
    /* height:auto with the width/height attributes present keeps the reserved box
       at the file's real aspect ratio, so nothing jumps when the bytes land. */
    width: 100%;
    height: auto;
    display: block;
    background: var(--bg-surface);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
  }
  /* Author, licence and a link back to the file — the attribution CC BY and
     CC BY-SA require. Small, but at full --text-secondary: dimming it further
     would drop it under 4.5:1, which is how the footer dedication broke once. */
  .pic figcaption {
    margin-top: var(--space-1);
    font-size: var(--fs-xs);
    line-height: 1.4;
    color: var(--text-secondary);
  }
  .pic figcaption a {
    color: var(--text-secondary);
    text-decoration: underline;
  }
  .pic figcaption a:hover {
    color: var(--text-primary);
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
  /* The trait that split this branch off, set apart from the narrative text —
     the accent rail carries the emphasis without another heading level. */
  .distinction {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    font-size: var(--fs-sm);
    line-height: var(--lh-base);
    color: var(--text-primary);
    background: rgb(56 189 248 / 0.07);
    border-left: 3px solid var(--accent-node);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
  .distinction .label {
    display: block;
    margin-bottom: 2px;
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-accent);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: var(--fs-xs);
  }

  /* Closes the panel with something concrete to picture — kept quieter than the
     distinction callout so it reads as a footnote, not a second headline. */
  .examples {
    margin: var(--space-3) 0 0;
    padding-top: var(--space-2);
    font-size: var(--fs-sm);
    line-height: var(--lh-base);
    color: var(--text-primary);
    border-top: 1px solid var(--border-subtle);
  }
  .examples .label {
    margin-right: var(--space-2);
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-secondary);
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
