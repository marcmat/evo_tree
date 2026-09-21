<script lang="ts">
  import { strings } from '../lib/i18n';
  import { collapseAll, expandAll, setQuery, ui } from '../lib/state.svelte';

  const t = $derived(strings(ui.lang));

  let searchValue = $state(ui.query);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function onInput(e: Event): void {
    searchValue = (e.target as HTMLInputElement).value;
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(searchValue), 150);
  }
</script>

<div class="outer">
  <!-- role="group", not "toolbar": the toolbar role promises arrow-key roving
       focus between the controls, which this does not implement. Tab order is
       the honest contract for four independent controls. -->
  <div class="toolbar container" role="group" aria-label={t.title}>
    <label class="living">
      <input type="checkbox" name="livingOnly" bind:checked={ui.livingOnly} />
      {t.livingOnly}
    </label>

    <button class="btn" aria-label={t.expandAll} onclick={expandAll}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5" /><path d="M7 4l5 5 5-5" /></svg>
      {t.expand}
    </button>
    <button class="btn" aria-label={t.collapseAll} onclick={collapseAll}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14l5-5 5 5" /><path d="M7 20l5-5 5 5" /></svg>
      {t.collapse}
    </button>

    <div class="search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      <input
        type="search"
        name="q"
        inputmode="search"
        autocomplete="off"
        spellcheck="false"
        placeholder={t.search}
        value={searchValue}
        oninput={onInput}
        aria-label={t.search}
      />
    </div>
  </div>
</div>

<style>
  .outer {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgb(9 13 22 / 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border-subtle);
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    padding-block: var(--space-3);
  }

  .living {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    /* The label is the hit target for the 14px checkbox inside it, so it carries
       the 24px WCAG 2.2 minimum rather than the input. */
    min-height: 24px;
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .living input {
    width: 14px;
    height: 14px;
    accent-color: var(--accent-survived);
    cursor: pointer;
  }
  .living:hover {
    color: var(--text-primary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    font: var(--fw-medium) var(--fs-sm) / 1 var(--font-sans);
    color: var(--text-secondary);
    background: var(--bg-surface);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background var(--timing-fast),
      color var(--timing-fast);
  }
  .btn:hover {
    background: var(--bg-surface2);
    color: var(--text-primary);
  }
  .btn:focus-visible {
    outline: 2px solid var(--accent-node);
    outline-offset: 2px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-muted);
  }
  /* Focus replacement for the input's suppressed native outline. */
  .search:focus-within {
    outline: 2px solid var(--accent-node);
    outline-offset: 1px;
  }
  .search input {
    width: 160px;
    padding: var(--space-2) var(--space-1);
    font: var(--fs-sm) / 1 var(--font-sans);
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
  }
  .search input::-webkit-search-cancel-button {
    filter: invert(0.6);
  }
  .search input::placeholder {
    color: var(--text-muted);
  }
  @media (max-width: 700px) {
    .search input {
      width: 110px;
    }
  }
</style>
