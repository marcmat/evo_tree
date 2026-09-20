import { SvelteSet } from 'svelte/reactivity';
import { AUDIENCES, type Audience, LANGS, type Lang } from './constants';
import { events, nodes } from './data';

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const params = new URLSearchParams(location.search);
const allIds = nodes.map((n) => n.id);
const idSet = new Set(allIds);
const eventIdSet = new Set(events.map((e) => e.id));

function initLang(): Lang {
  return pick(params.get('lang') ?? localStorage.getItem('lang'), LANGS, 'pl');
}
function initAudience(): Audience {
  return pick(params.get('aud') ?? localStorage.getItem('audience'), AUDIENCES, 'kids');
}
function initLivingOnly(): boolean {
  const v = params.get('living') ?? localStorage.getItem('livingOnly');
  return v === 'true' || v === '1';
}
// Tree is fully expanded by default, so the URL only carries the (usually empty)
// set of collapsed ids — keeping links short.
function initOpenIds(): SvelteSet<string> {
  const collapsed = new Set((params.get('c') ?? '').split(',').filter((id) => idSet.has(id)));
  return new SvelteSet(allIds.filter((id) => !collapsed.has(id)));
}
function initSelected(): string | null {
  const sel = params.get('sel');
  return sel && idSet.has(sel) ? sel : null;
}
function initPinnedEvent(): string | null {
  const ev = params.get('ev');
  return ev && eventIdSet.has(ev) ? ev : null;
}

/** Single reactive UI store. Default: fully expanded tree. */
export const ui = $state({
  lang: initLang(),
  audience: initAudience(),
  livingOnly: initLivingOnly(),
  query: params.get('q') ?? '',
  openIds: initOpenIds(),
  selectedId: initSelected(),
  hoveredId: null as string | null,
  // Roving tabindex: the single tree item that is in the Tab order.
  focusedId: (nodes.find((n) => n.parentId === null)?.id ?? null) as string | null,
  // Timeline event (extinction/milestone) marker interaction — same
  // hover-beats-persistent-selection pattern as hoveredId/selectedId above.
  hoveredEventId: null as string | null,
  pinnedEventId: initPinnedEvent(),
});

/* ---- persistence + shareable URL (deep-links every stateful control) ---- */
$effect.root(() => {
  $effect(() => {
    localStorage.setItem('livingOnly', String(ui.livingOnly));

    const url = new URL(location.href);
    const p = url.searchParams;
    // Language and audience are fixed (see constants.ts). Strip the old params
    // instead of writing them, so a stale ?lang=en link cannot leave the address
    // bar claiming a setting the app is not honouring.
    p.delete('lang');
    p.delete('aud');
    if (ui.livingOnly) p.set('living', '1');
    else p.delete('living');
    if (ui.query) p.set('q', ui.query);
    else p.delete('q');
    if (ui.selectedId) p.set('sel', ui.selectedId);
    else p.delete('sel');
    if (ui.pinnedEventId) p.set('ev', ui.pinnedEventId);
    else p.delete('ev');

    const collapsed = allIds.filter((id) => !ui.openIds.has(id));
    if (collapsed.length) p.set('c', collapsed.join(','));
    else p.delete('c');

    history.replaceState(null, '', url);
  });
});

/* ---- actions ---- */
export function toggleOpen(id: string): void {
  if (ui.openIds.has(id)) ui.openIds.delete(id);
  else ui.openIds.add(id);
}

export function expandAll(): void {
  for (const n of nodes) ui.openIds.add(n.id);
}

export function collapseAll(): void {
  ui.openIds.clear();
  ui.selectedId = null;
}

/** Clicking a name selects it (drives both the detail panel and the ancestor-path highlight). */
export function selectNode(id: string): void {
  ui.selectedId = ui.selectedId === id ? null : id;
}

/** Clicking a timeline event marker pins its tooltip open (toggle), like selectNode. */
export function selectEvent(id: string): void {
  ui.pinnedEventId = ui.pinnedEventId === id ? null : id;
}

// Snapshot of open state taken when a search begins, restored when it ends.
let openBeforeSearch: SvelteSet<string> | null = null;
export function setQuery(raw: string): void {
  const prev = ui.query;
  ui.query = raw.trim();
  if (ui.query) {
    if (!prev) openBeforeSearch = new SvelteSet(ui.openIds);
    for (const n of nodes) ui.openIds.add(n.id);
  } else if (prev && openBeforeSearch) {
    ui.openIds = openBeforeSearch;
    openBeforeSearch = null;
  }
}
