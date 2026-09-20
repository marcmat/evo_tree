<script lang="ts">
  import Chart from './components/Chart.svelte';
  import Sprite from './components/Sprite.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import { strings } from './lib/i18n';
  import { ui } from './lib/state.svelte';

  const t = $derived(strings(ui.lang));

  $effect(() => {
    document.documentElement.lang = ui.lang;
    document.title = t.title;
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      ui.selectedId = null;
      ui.pinnedEventId = null;
    }
  }}
/>

<Sprite />

<a class="skip-link" href="#main">{t.skipToContent}</a>

<header class="container">
  <h1>{t.title}</h1>
  <p>{t.subtitle}</p>
</header>

<main id="main" tabindex="-1">
  <Toolbar />
  <Chart />
</main>

<footer class="container">
  🧬 {t.footer} <span translate="no">Claude</span> · <span translate="no">v{__APP_VERSION__}</span>
  <span class="dedication">Mikołaj, twój praprapra…dziadek był rybą. Serio. — Tata</span>
</footer>

<style>
  header {
    padding-block: var(--space-8) var(--space-5);
    text-align: center;
  }
  header h1 {
    margin: 0 0 var(--space-2);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
    color: var(--text-accent);
    letter-spacing: -0.02em;
    text-wrap: balance;
  }

  /* Skip link: off-screen until focused */
  .skip-link {
    position: fixed;
    top: var(--space-2);
    left: var(--space-2);
    z-index: 200;
    padding: var(--space-2) var(--space-3);
    color: var(--text-primary);
    background: var(--bg-surface3);
    border: 1px solid var(--accent-node);
    border-radius: var(--radius-md);
    transform: translateY(-200%);
    transition: transform var(--timing-fast) ease;
  }
  .skip-link:focus {
    transform: translateY(0);
  }
  header p {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--text-secondary);
  }
  main {
    display: block;
  }
  footer {
    margin-top: var(--space-8);
    padding-block: var(--space-6);
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    text-align: center;
    border-top: 1px solid var(--border-subtle);
  }
  /* No opacity here: dimming --text-secondary drops contrast below the 4.5:1
     threshold against --bg-page. Italic alone sets the dedication apart. */
  .dedication {
    display: block;
    margin-top: var(--space-2);
    font-style: italic;
    text-wrap: balance;
  }
  @media (max-width: 700px) {
    header h1 {
      font-size: var(--fs-lg);
    }
  }
</style>
