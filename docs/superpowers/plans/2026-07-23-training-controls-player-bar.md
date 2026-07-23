# Training Controls Media-Player Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the inline "2 — Training Controls" panel into a fixed, vividly-colored, media-player-style bottom overlay bar with a two-row layout (transport row always visible, secondary row collapsible), toggleable from a new header button, defaulting to visible on load.

**Architecture:** `src/ui/controls.js` is changed minimally — `initControls` takes two mount containers (`primaryEl`, `secondaryEl`) instead of one, splitting existing markup across them with zero behavior change. A new `src/ui/playerBar.js` owns the bar chrome: fixed positioning, row1/row2 split, expand/collapse, show/hide, and mounts `initControls` inside it. `index.html` drops the old controls section, renumbers the test section, and adds a header toggle button + bar container. `main.js` wires `initPlayerBar` in place of the old direct `initControls` call.

**Tech Stack:** Vanilla JS (ES modules), Tailwind CSS v4 (`@theme` tokens in `src/ui/layout.css`), Vitest + jsdom for tests.

## Global Constraints

- Row 2 is collapsed by default on load; bar itself is visible by default on load.
- Bar toggle visibility state is NOT persisted (always defaults visible on reload).
- Body `padding-bottom` is reserved for the bar's maximum height (row1 + row2 expanded) unconditionally — no dynamic resize on expand/collapse.
- Bar uses `position: fixed; inset-inline: 0; bottom: 0; z-index: 50`.
- Hidden state uses `translate-y-full` + transition, with `visibility: hidden` applied post-transition to remove from tab order.
- No Playwright/e2e tests — vitest + jsdom only.
- Existing `initControls` callback contract (`onPlay`, `onPause`, `onStep`, `onStepEpoch`, `onReset`, `onModeChange`, `onSpeedChange`, `onTutorialToggle`, `onNext`, `onLambdaOverrideChange`, `onMuOverrideChange`) must not change.
- Existing `controlsHandle.enable()` and `controlsHandle.updateStats(values)` behavior must not change from `main.js`'s perspective.

---

## File Structure

- Modify: `src/ui/controls.js` — split markup across `primaryEl`/`secondaryEl`, fix `updateStats`/element lookups to work across both containers.
- Create: `src/ui/playerBar.js` — bar chrome: fixed positioning, row split, expand/collapse, show/hide, mounts `initControls`.
- Modify: `index.html` — remove old controls section, renumber test section, add header toggle button + `#player-bar` container.
- Modify: `src/main.js` — swap `initControls` call for `initPlayerBar`, wire header toggle button.
- Modify: `src/ui/layout.css` — add control-deck color tokens and bar-specific styles (slide transition, stat chip colors).
- Create: `src/test/ui/playerBar.test.js` — tests for playerBar.js.
- Create: `src/test/ui/controls.test.js` — tests for the two-container split behavior of controls.js.

---

## Task 1: Split `initControls` across two mount containers

**Files:**
- Modify: `src/ui/controls.js` (full file, currently 138 lines)
- Test: `src/test/ui/controls.test.js`

**Interfaces:**
- Produces: `initControls(primaryEl, secondaryEl, callbacks)` → `{ enable(), updateStats(values), els }`
  - `primaryEl` receives: mode radios row is REMOVED from primary — moved to secondary (see markup below). Transport buttons row, speed/tutorial/next row, and a primary stats subset (epoch, step, val acc) go in `primaryEl`.
  - `secondaryEl` receives: mode radios row, lambda override row, mu override row, and remaining stats (lambda, mu, domain acc, PAD).
  - `els` keys unchanged (`play`, `pause`, `step`, `stepEpoch`, `reset`, `next`, `speedSlider`, `speedValue`, `tutorialToggle`, `lambdaToggle`, `lambdaSlider`, `lambdaValue`, `muToggle`, `muSlider`, `muValue`).

- [ ] **Step 1: Write the failing test**

Create `src/test/ui/controls.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initControls } from '../../ui/controls.js';

describe('initControls with split containers', () => {
  let primaryEl, secondaryEl;

  beforeEach(() => {
    document.body.innerHTML = '<div id="primary"></div><div id="secondary"></div>';
    primaryEl = document.getElementById('primary');
    secondaryEl = document.getElementById('secondary');
  });

  it('mounts transport buttons in primaryEl and mode radios in secondaryEl', () => {
    initControls(primaryEl, secondaryEl, {});
    expect(primaryEl.querySelector('#btn-play')).not.toBeNull();
    expect(primaryEl.querySelector('#btn-pause')).not.toBeNull();
    expect(secondaryEl.querySelector('input[name="mode"]')).not.toBeNull();
    expect(primaryEl.querySelector('input[name="mode"]')).toBeNull();
  });

  it('wires callbacks across both containers', () => {
    const onPlay = vi.fn();
    const onModeChange = vi.fn();
    const handle = initControls(primaryEl, secondaryEl, { onPlay, onModeChange });
    handle.enable();

    primaryEl.querySelector('#btn-play').click();
    expect(onPlay).toHaveBeenCalledOnce();

    const plainRadio = secondaryEl.querySelector('input[name="mode"][value="plain"]');
    plainRadio.checked = true;
    plainRadio.dispatchEvent(new Event('change'));
    expect(onModeChange).toHaveBeenCalledWith('plain');
  });

  it('updateStats writes into fields split across both containers', () => {
    const handle = initControls(primaryEl, secondaryEl, {});
    handle.updateStats({ epoch: 3, globalStep: 40, lambda: 0.25, mu: 0.001, valAccuracy: 0.5, trainDomainAccuracy: 0.6, pad: 0.1 });

    expect(primaryEl.querySelector('#stat-epoch').textContent).toBe('3');
    expect(primaryEl.querySelector('#stat-step').textContent).toBe('40');
    expect(secondaryEl.querySelector('#stat-lambda').textContent).toBe('0.250');
    expect(secondaryEl.querySelector('#stat-mu').textContent).toBe('0.00100');
  });

  it('enable() enables transport buttons in primaryEl and next button respects tutorial toggle', () => {
    const handle = initControls(primaryEl, secondaryEl, {});
    handle.enable();
    expect(primaryEl.querySelector('#btn-play').disabled).toBe(false);
    expect(primaryEl.querySelector('#btn-next').disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/ui/controls.test.js`
Expected: FAIL — `initControls` currently takes `(containerEl, callbacks)`, single container, so `#btn-play` won't be found in `primaryEl` when called with the new 3-arg signature (callbacks arg lands in the wrong position).

- [ ] **Step 3: Rewrite `src/ui/controls.js` with the split signature**

Replace the full contents of `src/ui/controls.js`:

```javascript
// Training controls: mode toggle (DANN / Plain-NN), Play/Pause/Step/
// Step-epoch/Reset, speed slider, Tutorial/Free-run toggle + Next button,
// and manual override sliders for lambda/mu. Toggling mode or pacing never
// touches the underlying generator — see runner.js.
//
// Markup is split across two mount points so a player-bar-style container
// can show `primaryEl` (transport + key stats) always and `secondaryEl`
// (mode/overrides/remaining stats) only when expanded.

const BTN = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel';
const FIELD_FOCUS = 'accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel rounded-sm';

export function initControls(primaryEl, secondaryEl, callbacks) {
  primaryEl.innerHTML = `
    <div class="flex flex-col gap-2.5">
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" id="btn-play" class="${BTN}" disabled>Play</button>
        <button type="button" id="btn-pause" class="${BTN}" disabled>Pause</button>
        <button type="button" id="btn-step" class="${BTN}" disabled>Step</button>
        <button type="button" id="btn-step-epoch" class="${BTN}" disabled>Step epoch</button>
        <button type="button" id="btn-reset" class="${BTN}" disabled>Reset</button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink">Speed
          <input type="range" id="speed-slider" min="0.1" max="5" step="0.1" value="1" class="${FIELD_FOCUS}" />
          <span id="speed-value" class="text-sm text-muted tabular-nums">1.0x</span>
        </label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="tutorial-toggle" class="${FIELD_FOCUS}" /> Tutorial mode</label>
        <button type="button" id="btn-next" class="${BTN}" disabled>Next step</button>
      </div>

      <div class="flex flex-wrap items-center gap-4 text-sm text-muted" id="stats-row-primary">
        <span>epoch: <b id="stat-epoch" class="text-ink tabular-nums">0</b></span>
        <span>step: <b id="stat-step" class="text-ink tabular-nums">0</b></span>
        <span>val acc: <b id="stat-val-acc" class="text-ink tabular-nums">-</b></span>
      </div>
    </div>
  `;

  secondaryEl.innerHTML = `
    <div class="flex flex-col gap-2.5">
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="dann" class="${FIELD_FOCUS}" checked /> DANN (adversarial)</label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="plain" class="${FIELD_FOCUS}" /> Plain NN (stop-gradient baseline)</label>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="lambda-override-toggle" class="${FIELD_FOCUS}" /> Override lambda</label>
        <input type="range" id="lambda-slider" min="0" max="1" step="0.01" value="0.5" class="${FIELD_FOCUS}" disabled />
        <span id="lambda-value" class="text-sm text-muted tabular-nums">0.50</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="mu-override-toggle" class="${FIELD_FOCUS}" /> Override mu (learning rate)</label>
        <input type="range" id="mu-slider" min="0.0001" max="0.05" step="0.0001" value="0.01" class="${FIELD_FOCUS}" disabled />
        <span id="mu-value" class="text-sm text-muted tabular-nums">0.0100</span>
      </div>

      <div class="flex flex-wrap items-center gap-4 text-sm text-muted" id="stats-row-secondary">
        <span>lambda: <b id="stat-lambda" class="text-ink tabular-nums">-</b></span>
        <span>mu: <b id="stat-mu" class="text-ink tabular-nums">-</b></span>
        <span>domain acc: <b id="stat-domain-acc" class="text-ink tabular-nums">-</b></span>
        <span>PAD: <b id="stat-pad" class="text-ink tabular-nums">-</b></span>
      </div>
    </div>
  `;

  const query = (sel) => primaryEl.querySelector(sel) ?? secondaryEl.querySelector(sel);

  const els = {
    play: query('#btn-play'),
    pause: query('#btn-pause'),
    step: query('#btn-step'),
    stepEpoch: query('#btn-step-epoch'),
    reset: query('#btn-reset'),
    next: query('#btn-next'),
    speedSlider: query('#speed-slider'),
    speedValue: query('#speed-value'),
    tutorialToggle: query('#tutorial-toggle'),
    lambdaToggle: query('#lambda-override-toggle'),
    lambdaSlider: query('#lambda-slider'),
    lambdaValue: query('#lambda-value'),
    muToggle: query('#mu-override-toggle'),
    muSlider: query('#mu-slider'),
    muValue: query('#mu-value'),
  };

  els.play.addEventListener('click', () => callbacks.onPlay?.());
  els.pause.addEventListener('click', () => callbacks.onPause?.());
  els.step.addEventListener('click', () => callbacks.onStep?.());
  els.stepEpoch.addEventListener('click', () => callbacks.onStepEpoch?.());
  els.reset.addEventListener('click', () => callbacks.onReset?.());
  els.next.addEventListener('click', () => callbacks.onNext?.());

  secondaryEl.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) callbacks.onModeChange?.(e.target.value);
    });
  });

  els.speedSlider.addEventListener('input', () => {
    const v = parseFloat(els.speedSlider.value);
    els.speedValue.textContent = `${v.toFixed(1)}x`;
    callbacks.onSpeedChange?.(v);
  });

  els.tutorialToggle.addEventListener('change', () => {
    const on = els.tutorialToggle.checked;
    els.next.disabled = !on || els.play.disabled;
    callbacks.onTutorialToggle?.(on);
  });

  els.lambdaToggle.addEventListener('change', () => {
    els.lambdaSlider.disabled = !els.lambdaToggle.checked;
    callbacks.onLambdaOverrideChange?.(els.lambdaToggle.checked ? parseFloat(els.lambdaSlider.value) : null);
  });
  els.lambdaSlider.addEventListener('input', () => {
    els.lambdaValue.textContent = parseFloat(els.lambdaSlider.value).toFixed(2);
    if (els.lambdaToggle.checked) callbacks.onLambdaOverrideChange?.(parseFloat(els.lambdaSlider.value));
  });

  els.muToggle.addEventListener('change', () => {
    els.muSlider.disabled = !els.muToggle.checked;
    callbacks.onMuOverrideChange?.(els.muToggle.checked ? parseFloat(els.muSlider.value) : null);
  });
  els.muSlider.addEventListener('input', () => {
    els.muValue.textContent = parseFloat(els.muSlider.value).toFixed(4);
    if (els.muToggle.checked) callbacks.onMuOverrideChange?.(parseFloat(els.muSlider.value));
  });

  function enable() {
    els.play.disabled = false;
    els.pause.disabled = false;
    els.step.disabled = false;
    els.stepEpoch.disabled = false;
    els.reset.disabled = false;
    els.next.disabled = !els.tutorialToggle.checked;
  }

  function updateStats(values) {
    if (values.epoch !== undefined) query('#stat-epoch').textContent = values.epoch;
    if (values.globalStep !== undefined) query('#stat-step').textContent = values.globalStep;
    if (values.lambda !== undefined) query('#stat-lambda').textContent = values.lambda.toFixed(3);
    if (values.mu !== undefined) query('#stat-mu').textContent = values.mu.toFixed(5);
    if (values.valAccuracy !== undefined) query('#stat-val-acc').textContent = (values.valAccuracy * 100).toFixed(1) + '%';
    if (values.trainDomainAccuracy !== undefined) query('#stat-domain-acc').textContent = (values.trainDomainAccuracy * 100).toFixed(1) + '%';
    if (values.pad !== undefined) query('#stat-pad').textContent = values.pad.toFixed(3);
  }

  return { enable, updateStats, els };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/ui/controls.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/controls.js src/test/ui/controls.test.js
git commit -m "refactor: split initControls markup across primary/secondary containers"
```

---

## Task 2: Add control-deck color tokens to `layout.css`

**Files:**
- Modify: `src/ui/layout.css`

**Interfaces:**
- Produces: CSS custom properties `--deck-bg-from`, `--deck-bg-to`, `--deck-accent`, `--deck-accent-hover`, `--deck-chip-*` colors, and a `.player-bar-hidden` utility class used by `playerBar.js`.

- [ ] **Step 1: Add the deck tokens and slide-transition class**

Append to the end of `src/ui/layout.css`:

```css
/* Control-deck: the training-controls player bar is the one deliberately
   vivid surface in an otherwise muted app — kept as CSS vars (not Tailwind
   @theme tokens) since these colors are intentionally theme-invariant. */
:root {
  --deck-bg-from: #4c1d95;
  --deck-bg-to: #1e1b4b;
  --deck-accent: #22d3ee;
  --deck-accent-hover: #67e8f9;
  --deck-chip-epoch: #60a5fa;
  --deck-chip-step: #4ade80;
  --deck-chip-valacc: #34d399;
  --deck-chip-lambda: #c084fc;
  --deck-chip-mu: #f87171;
  --deck-chip-domainacc: #facc15;
  --deck-chip-pad: #fb923c;
}

#player-bar {
  transition: transform 300ms ease, visibility 300ms;
}
.player-bar-hidden {
  transform: translateY(100%);
}
```

- [ ] **Step 2: Verify build still compiles**

Run: `npm run build`
Expected: build succeeds, no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/layout.css
git commit -m "style: add control-deck color tokens for player bar"
```

---

## Task 3: Create `src/ui/playerBar.js`

**Files:**
- Create: `src/ui/playerBar.js`
- Test: `src/test/ui/playerBar.test.js`

**Interfaces:**
- Consumes: `initControls(primaryEl, secondaryEl, callbacks)` from `src/ui/controls.js` (Task 1).
- Produces: `initPlayerBar(containerEl, callbacks)` → `{ setVisible(bool), isVisible(), enable(), updateStats(values), els }`
  - `callbacks` is passed through verbatim to `initControls` (same shape as before: `onPlay`, `onPause`, `onStep`, `onStepEpoch`, `onReset`, `onModeChange`, `onSpeedChange`, `onTutorialToggle`, `onNext`, `onLambdaOverrideChange`, `onMuOverrideChange`).
  - `containerEl` is expected to be an empty element that becomes `#player-bar` content root (the element itself keeps whatever id/attrs `index.html` set on it).

- [ ] **Step 1: Write the failing test**

Create `src/test/ui/playerBar.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { initPlayerBar } from '../../ui/playerBar.js';

describe('initPlayerBar', () => {
  let containerEl;

  beforeEach(() => {
    document.body.innerHTML = '<div id="player-bar"></div>';
    containerEl = document.getElementById('player-bar');
  });

  it('is visible by default on init', () => {
    initPlayerBar(containerEl, {});
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(false);
    expect(containerEl.getAttribute('aria-hidden')).toBe('false');
  });

  it('setVisible(false) hides the bar', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.setVisible(false);
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(true);
    expect(containerEl.getAttribute('aria-hidden')).toBe('true');
    expect(bar.isVisible()).toBe(false);
  });

  it('setVisible(true) shows the bar again', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.setVisible(false);
    bar.setVisible(true);
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(false);
    expect(bar.isVisible()).toBe(true);
  });

  it('row 2 (secondary) is collapsed by default', () => {
    initPlayerBar(containerEl, {});
    const secondary = containerEl.querySelector('#player-bar-secondary');
    expect(secondary.classList.contains('hidden')).toBe(true);
    const chevron = containerEl.querySelector('#player-bar-expand');
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
  });

  it('expand chevron reveals row 2 and toggles aria-expanded', () => {
    initPlayerBar(containerEl, {});
    const chevron = containerEl.querySelector('#player-bar-expand');
    const secondary = containerEl.querySelector('#player-bar-secondary');

    chevron.click();
    expect(secondary.classList.contains('hidden')).toBe(false);
    expect(chevron.getAttribute('aria-expanded')).toBe('true');

    chevron.click();
    expect(secondary.classList.contains('hidden')).toBe(true);
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
  });

  it('transport buttons stay disabled until enable() is called', () => {
    const bar = initPlayerBar(containerEl, {});
    expect(containerEl.querySelector('#btn-play').disabled).toBe(true);
    bar.enable();
    expect(containerEl.querySelector('#btn-play').disabled).toBe(false);
  });

  it('forwards callbacks to the underlying controls', () => {
    let played = false;
    const bar = initPlayerBar(containerEl, { onPlay: () => { played = true; } });
    bar.enable();
    containerEl.querySelector('#btn-play').click();
    expect(played).toBe(true);
  });

  it('updateStats writes stats across both rows', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.updateStats({ epoch: 5, globalStep: 10, lambda: 0.1, mu: 0.002, valAccuracy: 0.9, trainDomainAccuracy: 0.5, pad: 0.05 });
    expect(containerEl.querySelector('#stat-epoch').textContent).toBe('5');
    expect(containerEl.querySelector('#stat-lambda').textContent).toBe('0.100');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/ui/playerBar.test.js`
Expected: FAIL — `Cannot find module '../../ui/playerBar.js'`

- [ ] **Step 3: Write `src/ui/playerBar.js`**

```javascript
// Media-player-style overlay bar for training controls. Owns the bar chrome
// (fixed positioning, row1/row2 split, expand/collapse, show/hide) and
// mounts initControls inside it. Controls' own callback contract and
// enable()/updateStats() behavior are untouched — see controls.js.

import { initControls } from './controls.js';

const CHIP_BTN = 'flex items-center justify-center rounded-full h-9 w-9 text-lg text-white transition-colors enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deck-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';

export function initPlayerBar(containerEl, callbacks) {
  containerEl.setAttribute('aria-hidden', 'false');
  containerEl.className = `${containerEl.className} fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gradient-to-r from-[var(--deck-bg-from)] to-[var(--deck-bg-to)] px-6 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`.trim();

  containerEl.innerHTML = `
    <div class="mx-auto flex max-w-[1800px] flex-col gap-2">
      <div class="flex items-center gap-4">
        <div id="player-bar-primary" class="flex-1"></div>
        <button
          type="button"
          id="player-bar-expand"
          aria-expanded="false"
          aria-controls="player-bar-secondary"
          class="${CHIP_BTN}"
          title="Show more controls"
        >&#9662;</button>
      </div>
      <div id="player-bar-secondary" class="hidden border-t border-white/10 pt-2.5"></div>
    </div>
  `;

  const primaryEl = containerEl.querySelector('#player-bar-primary');
  const secondaryEl = containerEl.querySelector('#player-bar-secondary');
  const chevron = containerEl.querySelector('#player-bar-expand');

  const controls = initControls(primaryEl, secondaryEl, callbacks);

  chevron.addEventListener('click', () => {
    const expanded = chevron.getAttribute('aria-expanded') === 'true';
    chevron.setAttribute('aria-expanded', String(!expanded));
    secondaryEl.classList.toggle('hidden', expanded);
    chevron.innerHTML = expanded ? '&#9662;' : '&#9652;';
  });

  let visible = true;

  function setVisible(next) {
    visible = next;
    containerEl.classList.toggle('player-bar-hidden', !visible);
    containerEl.setAttribute('aria-hidden', String(!visible));
  }

  function isVisible() {
    return visible;
  }

  return { setVisible, isVisible, enable: controls.enable, updateStats: controls.updateStats, els: controls.els };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/ui/playerBar.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/playerBar.js src/test/ui/playerBar.test.js
git commit -m "feat: add media-player-style training controls overlay bar"
```

---

## Task 4: Wire the bar and toggle into `index.html` + `main.js`

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `initPlayerBar(containerEl, callbacks)` from Task 3.

- [ ] **Step 1: Update `index.html`**

Remove the old "2 — Training Controls" section (lines 39-42 of the current file), renumber the test section header from "3" to "2", add a header toggle button, and add the `#player-bar` mount element as the last child of `<body>`.

Replace the `<header>` block (current lines 20-31):

```html
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="mb-1 text-2xl font-semibold tracking-tight text-ink">DANN Lab</h1>
        <p class="m-0 text-sm text-muted">Domain-Adversarial Neural Networks, trained and narrated in your browser (Ganin et al. 2016)</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          id="player-toggle"
          type="button"
          aria-pressed="true"
          class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >Hide Controls</button>
        <button
          id="theme-toggle"
          type="button"
          aria-pressed="false"
          class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        ></button>
      </div>
    </header>
```

Remove the old controls `<section id="control-panel">` block entirely (current lines 39-42):

```html
    <section id="control-panel" class="rounded-xl border border-border-card bg-panel/40 p-6 backdrop-blur-sm">
      <h2 class="mb-3 text-base font-semibold uppercase tracking-wider text-muted">2 — Training Controls</h2>
      <div id="controls"></div>
    </section>
```

Renumber the test-panel header (current line 88) from `3 — Test a New Image` to `2 — Test a New Image`:

```html
      <h2 class="mb-3 text-base font-semibold uppercase tracking-wider text-muted">2 — Test a New Image</h2>
```

Add body bottom padding to reserve space for the bar's max height, and add the `#player-bar` mount as the last element before the closing `</body>` (after the `#app` div, sibling to it — NOT inside `#app`, so its fixed positioning isn't affected by `#app`'s `max-w-[1800px] mx-auto` wrapper):

Change the `#app` div's class (current line 19) to add bottom padding for the max bar height:

```html
  <div id="app" class="mx-auto flex max-w-[1800px] flex-col gap-6 px-6 pt-6 pb-[220px]">
```

Add `#player-bar` right before the closing `</body>` tag (after the existing `<script type="module" src="/src/main.js"></script>` line, or before it — place it before the script tag):

```html
  <div id="player-bar"></div>

  <script type="module" src="/src/main.js"></script>
```

- [ ] **Step 2: Update `src/main.js`**

Change the import (current line 9):

```javascript
import { initPlayerBar } from './ui/playerBar.js';
```

Change the `els` object (current lines 22-35) to reference `player-bar` instead of `controls`, and add the toggle button lookup:

```javascript
const els = {
  uploaders: document.getElementById('uploaders'),
  playerBar: document.getElementById('player-bar'),
  playerToggle: document.getElementById('player-toggle'),
  mathContent: document.getElementById('math-content'),
  mathView: document.getElementById('math-view'),
  mathLegend: document.getElementById('math-legend'),
  tutorCaption: document.getElementById('tutor-caption'),
  algoTrackerBody: document.getElementById('algo-tracker-body'),
  networkSvg: document.getElementById('network-svg'),
  lossChartBody: document.getElementById('loss-chart-body'),
  domainMeterBody: document.getElementById('domain-meter-body'),
  featureScatterBody: document.getElementById('feature-scatter-body'),
  testPanelBody: document.getElementById('test-panel-body'),
};
```

Change `const controlsHandle = initControls(els.controls, {` (current line 72) to:

```javascript
const controlsHandle = initPlayerBar(els.playerBar, {
```

(keep the rest of that call's callback object body exactly as-is — only the function name and first argument change).

After the `initPlayerBar(...)` call block closes (right after its closing `});`), add the toggle wiring:

```javascript
els.playerToggle.addEventListener('click', () => {
  const next = !controlsHandle.isVisible();
  controlsHandle.setVisible(next);
  els.playerToggle.textContent = next ? 'Hide Controls' : 'Show Controls';
  els.playerToggle.setAttribute('aria-pressed', String(next));
});
```

- [ ] **Step 3: Verify dev build runs and stats/controls still work**

Run: `npm run build`
Expected: build succeeds with no errors.

Run: `npx vitest run`
Expected: all existing tests plus the two new UI test files pass.

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: mount training controls as bottom player bar with header toggle"
```

---

## Task 5: Manual verification in dev server

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: server starts on the configured port (check terminal output for URL).

- [ ] **Step 2: Manually verify in browser**
  - Player bar visible at bottom of viewport on load, vivid purple/cyan control-deck styling distinct from the rest of the app.
  - Row 2 (mode/overrides/extra stats) is collapsed by default; clicking the chevron expands it and flips the arrow direction.
  - Clicking "Hide Controls" in the header slides the bar down off-screen and label flips to "Show Controls"; clicking again brings it back.
  - Page content never gets hidden behind the bar in either collapsed or expanded state (bottom padding is reserved for max height).
  - Uploading a dataset enables the transport buttons and stats update live during training, same as before the refactor.
  - Test-image section now reads "2 — Test a New Image".

- [ ] **Step 3: Stop dev server**

Report findings back; fix any visual/behavioral issues found before considering the plan complete.

---

## Self-Review Notes

- **Spec coverage:** header toggle (Task 4) ✓, default-visible (playerBar.js `visible = true`) ✓, fixed-bottom overlay (Task 3 classes) ✓, two-row collapsible layout (Task 1 split + Task 3 chevron) ✓, row 2 collapsed by default (Task 3) ✓, old section removed + renumbering (Task 4) ✓, max-height body padding (Task 4, `pb-[220px]`) ✓, vivid control-deck palette contrasting muted app (Task 2 tokens + Task 3 gradient classes) ✓, vitest/jsdom tests only, no e2e (Tasks 1 & 3) ✓.
- **Placeholder scan:** none found — all steps contain complete code.
- **Type consistency:** `initControls(primaryEl, secondaryEl, callbacks)` signature matches between Task 1's implementation and Task 3's consumption. `initPlayerBar(containerEl, callbacks)` return shape (`setVisible`, `isVisible`, `enable`, `updateStats`, `els`) matches Task 4's usage in `main.js` (`controlsHandle.isVisible()`, `controlsHandle.setVisible()`, plus pre-existing `controlsHandle.enable()`/`updateStats()` calls elsewhere in `main.js` which are unchanged and still valid against this return shape).
