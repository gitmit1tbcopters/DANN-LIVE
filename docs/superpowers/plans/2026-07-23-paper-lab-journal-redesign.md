# Paper Lab Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "Dark Lab Notebook" visual system with "The Paper Lab Journal" — a cream-paper, ink-typography redesign with a two-accent (blue-black ink / red pen) color system — across the whole app, in both light and dark ("night desk lamp") themes.

**Architecture:** This is a visual-only pass. No DOM structure, component API, or behavior changes — only CSS custom properties, Tailwind utility classes in template strings, and SVG color attributes change. Existing tests assert structure/behavior (not color) and must stay green throughout; they serve as the regression guard for this refactor.

**Tech Stack:** Vite, Tailwind CSS v4 (`@theme` tokens in `src/ui/layout.css`), vanilla JS template strings, D3 (network diagram SVG), tfjs-vis (loss chart — limited styling control, see Task 7 note).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-paper-lab-journal-redesign-design.md`
- Only two accent hues anywhere in the UI: **blue-black ink** (`#2c4a7c`-family, structural/semantic) and **red pen** (`#c0392b`-family, live/active state only)
- No backdrop-blur anywhere — depth via shadow, not translucency
- No hover scale/transform on buttons — state changes communicate through color only (carried-forward rule)
- `tabular-nums` stays on every live-updating numeric value (epoch, step, loss, accuracy, lambda, mu, PAD)
- No layout/grid/spacing/corner-radius changes — color, material (blur→shadow), and type only
- Dark mode ("night desk lamp"): warm dark brown/near-black base, cream ink text, same two accent hues held recognizable across both themes
- Headers switch to serif (`ui-serif`/Georgia stack); body stays sans; numbers stay mono
- Existing tests (`src/test/ui/controls.test.js`, `src/test/ui/playerBar.test.js`) must pass unmodified after every task — they test structure/behavior, not visuals, and are the safety net for this refactor
- Run `npm test` after every task; run `npm run build` at the end (Task 9)

---

### Task 1: Rebuild color token system in `layout.css`

**Files:**
- Modify: `src/ui/layout.css:1-49` (imports, `@theme` block, `:root` and `:root[data-theme='light']` blocks)

**Interfaces:**
- Consumes: nothing (this is the token source of truth)
- Produces: CSS custom properties consumed by every other task — `--bg`, `--panel-bg`, `--sunken`, `--border`, `--border-card`, `--text`, `--text-dim`, `--accent` (blue-black ink), `--accent-hover`, `--accent-rose` (renamed meaning: now red pen), `--surface`, `--surface-hover`. Tailwind `@theme` maps these to `color-canvas`, `color-panel`, `color-border`, `color-border-card`, `color-ink`, `color-muted`, `color-accent`, `color-accent-hover`, `color-accent-rose`, `color-surface`, `color-surface-hover`, `color-sunken` — utility class names (`bg-canvas`, `text-ink`, `bg-accent-rose`, etc.) stay the same across the whole app; only the hex values they resolve to change. No downstream task needs to rename any Tailwind class.

- [ ] **Step 1: Replace the `:root` (dark = "night desk lamp") token block**

Replace lines 19-33 of `src/ui/layout.css`:

```css
:root {
  --bg: #1a1512;
  --panel-bg: #241d18;
  --sunken: #14100d;
  --border: #3a2f26;
  --border-card: #2e2620;
  --text: #f0e6d6;
  --text-dim: #b3a390;
  --accent: #6b8cc0;
  --accent-hover: #8ba8d4;
  --accent-rose: #e0574a;
  --surface: #2e2620;
  --surface-hover: #3a2f26;
  color-scheme: dark;
}
```

- [ ] **Step 2: Replace the `:root[data-theme='light']` (light = paper) token block**

Replace lines 35-49:

```css
:root[data-theme='light'] {
  --bg: #f5f0e6;
  --panel-bg: #faf6ec;
  --sunken: #ece4d4;
  --border: #d8cdb8;
  --border-card: #e3d9c4;
  --text: #1c1a17;
  --text-dim: #6b5f4f;
  --accent: #2c4a7c;
  --accent-hover: #1e3660;
  --accent-rose: #c0392b;
  --surface: #ece4d4;
  --surface-hover: #ddd0b5;
  color-scheme: light;
}
```

- [ ] **Step 3: Run existing tests to confirm no regressions from token changes**

Run: `npm test`
Expected: PASS (all existing suites — token value changes don't affect DOM structure/behavior assertions)

- [ ] **Step 4: Commit**

```bash
git add src/ui/layout.css
git commit -m "style: replace dark-glass color tokens with paper lab journal palette"
```

---

### Task 2: Body background texture, font stack, and active-line/active-step recoloring in `layout.css`

**Files:**
- Modify: `src/ui/layout.css:51-169` (body rule, `.algo-list`, `.math-legend`, `.math-step.active-step`)

**Interfaces:**
- Consumes: `--bg`, `--text`, `--accent`, `--accent-rose` from Task 1
- Produces: `body` font-family now serif-aware via a new `--font-headline` custom property other tasks/markup can reference for header elements; grain texture applied at body level so every page inherits it without per-panel work

- [ ] **Step 1: Add grain texture and update body rule**

Replace lines 51-58:

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  background-color: var(--bg);
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 3px 3px;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

:root[data-theme='light'] body {
  background-image:
    radial-gradient(circle at 1px 1px, rgba(28, 26, 23, 0.04) 1px, transparent 0);
  background-size: 3px 3px;
}
```

Note: grain uses a repeating radial-gradient dot pattern (no external image asset, keeps the app's zero-network-dependency guarantee referenced in the spec). Dark mode keeps the default (white-tinted, very faint) grain from the base rule; light mode overrides with an ink-tinted grain so it reads correctly against cream.

- [ ] **Step 2: Add the serif headline font custom property**

Add directly after the `body` rule (before `.hint`):

```css
:root {
  --font-headline: ui-serif, Georgia, 'Times New Roman', serif;
}
```

- [ ] **Step 3: Recolor `.algo-list` active line from rose/pink glass to red-pen paper style**

Replace line 64:

```css
.algo-list li.active-line { background: rgba(192, 57, 43, 0.12); color: var(--text); box-shadow: inset 3px 0 0 var(--accent-rose); }
```

- [ ] **Step 4: Recolor `.math-step.active-step` from blue glass to blue-black ink paper style**

Replace lines 141-144:

```css
.math-step.active-step {
  background: rgba(44, 74, 124, 0.08);
  box-shadow: inset 3px 0 0 var(--accent);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/layout.css
git commit -m "style: add paper grain texture and serif headline token"
```

---

### Task 3: Recolor math symbol legend (`sym-*` classes) for both themes

**Files:**
- Modify: `src/ui/layout.css:79-139` (`.sym-*` dark rules, `:root[data-theme='light']` sym custom properties + rules)

**Interfaces:**
- Consumes: nothing new (self-contained color rules)
- Produces: same class names (`sym-x`, `sym-y`, `sym-d`, `sym-gf`, `sym-thetaf`, `sym-h`, `sym-gy`, `sym-thetay`, `sym-ly`, `sym-gd`, `sym-thetad`, `sym-ld`, `sym-grl`, `sym-lambda`, `sym-mu`, `sym-hclass`, `sym-epsilon`, `sym-pad`) consumed by `src/tutor/mathContent.js` legend/equation rendering — no rename, only new hex values

Per the spec's "Two-Ink Rule," the full multi-hue symbol legend (17 distinct hues) is preserved as-is functionally (each symbol needs a distinct color to stay legible in the math view), but every hue is re-tuned into the warm-paper family so nothing reads as neon-on-cream. The `L_d` (domain loss, `sym-ld`) symbol is the one legend entry that should land on red-pen exactly (it is explicitly the "live/active" domain-loss quantity called out in the spec); every other symbol gets a muted ink-family hue distinct enough to tell apart but consistent with the warm paper palette.

- [ ] **Step 1: Replace dark-mode `.sym-*` rules (lines 79-100)**

```css
/* One color per math symbol (see SYMBOL_LEGEND in mathContent.js), tuned
   separately per theme: lighter/warmer for the dark "night desk lamp"
   sunken background, deeper/more saturated for the light paper sunken
   background so contrast holds in both. L_d (sym-ld) is the one symbol
   pinned to red-pen — it's the spec's "live" domain-loss quantity. */
.sym-x { color: #8fb0d9; }
.sym-y { color: #9ecb8f; }
.sym-d { color: #e0c068; }
.sym-gf { color: #7fc4b8; }
.sym-thetaf { color: #7cc9d9; }
.sym-h { color: #a3a8e0; }
.sym-gy { color: #8fb0d9; }
.sym-thetay { color: #b3c9e8; }
.sym-ly { color: #6b8cc0; }
.sym-gd { color: #d99bb3; }
.sym-thetad { color: #d9a778; }
.sym-ld { color: #e0574a; }
.sym-grl { color: #b3a3d9; }
.sym-lambda { color: #c9a8e0; }
.sym-mu { color: #d98f8f; }
.sym-hclass { color: #b3a390; }
.sym-epsilon { color: #e0c878; }
.sym-pad { color: #8fcba3; }
```

- [ ] **Step 2: Replace light-mode sym custom properties (lines 102-121)**

```css
:root[data-theme='light'] {
  --sym-x: #2c4a7c;
  --sym-y: #2f6b3f;
  --sym-d: #8a6d1f;
  --sym-gf: #1f6b5e;
  --sym-thetaf: #1f6b7c;
  --sym-h: #4a3f8a;
  --sym-gy: #2c4a7c;
  --sym-thetay: #3d5f94;
  --sym-ly: #1e3660;
  --sym-gd: #8a3f5e;
  --sym-thetad: #8a5a2f;
  --sym-ld: #c0392b;
  --sym-grl: #5f4f8a;
  --sym-lambda: #6d4f8a;
  --sym-mu: #a13f3f;
  --sym-hclass: #6b5f4f;
  --sym-epsilon: #8a6d1f;
  --sym-pad: #2f6b4f;
}
```

(Lines 122-139, the `:root[data-theme='light'] .sym-x { color: var(--sym-x); }` etc. mapping rules, stay unchanged — they just reference the same custom property names, which now resolve to the new hex values above.)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/ui/layout.css
git commit -m "style: retune math symbol legend colors to paper journal palette"
```

---

### Task 4: Transport deck tokens — restyle bottom bar as ink "ruler/toolbar" strip

**Files:**
- Modify: `src/ui/layout.css:171-203` (`--deck-*` custom properties, `#player-bar` rules)

**Interfaces:**
- Consumes: nothing new
- Produces: `--deck-bg-from`, `--deck-bg-to`, `--deck-text`, `--deck-border`, `--deck-accent`, `--deck-accent-hover`, `--deck-chip-*` custom properties consumed by `src/ui/playerBar.js` (`CHIP_BTN` template) — same property names, new values. Per spec, the deck strip itself stays dark-on-both-themes (ink-dark, not cream) — this is the one place theme-invariant background is intentional.

- [ ] **Step 1: Replace deck token block (lines 171-195)**

```css
/* Control-deck: the training-controls player bar, styled as an ink-dark
   "ruler/toolbar" strip laid over the page — stays dark in both themes
   per spec (it's an instrument strip, not a paper surface). Chip accent
   colors stay theme-invariant for legibility against the dark strip. */
:root {
  --deck-bg-from: #14100d;
  --deck-bg-to: #14100d;
  --deck-text: #f0e6d6;
  --deck-border: rgba(240, 230, 214, 0.12);
  --deck-accent: #6b8cc0;
  --deck-accent-hover: #8ba8d4;
  --deck-chip-epoch: #8fb0d9;
  --deck-chip-step: #9ecb8f;
  --deck-chip-valacc: #8fcba3;
  --deck-chip-lambda: #c9a8e0;
  --deck-chip-mu: #d98f8f;
  --deck-chip-domainacc: #e0c068;
  --deck-chip-pad: #d9a778;
}

:root[data-theme='light'] {
  --deck-bg-from: #1c1a17;
  --deck-bg-to: #1c1a17;
  --deck-text: #f5f0e6;
  --deck-border: rgba(245, 240, 230, 0.12);
}
```

- [ ] **Step 2: Leave `#player-bar` / `.player-bar-hidden` transition rules (lines 197-203) unchanged** — no edit needed, positional/animation rules aren't color-dependent.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/ui/layout.css
git commit -m "style: restyle transport deck as ink-dark ruler strip"
```

---

### Task 5: Recolor transport icon buttons and dropzone active-state in JS template strings

**Files:**
- Modify: `src/ui/controls.js:11-18` (`ICON_PLAY`, `ICON_PAUSE`, `ICON_STEP`, `ICON_RESET` constants)
- Modify: `src/ui/uploaders.js:9` (`DROPZONE_ACTIVE` constant)

**Interfaces:**
- Consumes: Tailwind utility classes (arbitrary Tailwind colors, not custom properties — these are literal Tailwind color names like `bg-emerald-600`)
- Produces: same exported behavior (`initControls`, `initUploaders`) — only the class strings assigned to `ICON_PLAY`/`ICON_PAUSE`/`ICON_STEP`/`ICON_RESET`/`DROPZONE_ACTIVE` change. No function signature or DOM structure changes.

Per spec: transport buttons keep individually distinct hues per action but shift from neon (emerald/amber/sky/rose) to muted ink-adjacent tones. Reset button gets closest to red-pen since a reset is a "this matters, pay attention" action akin to the dropzone's red-pen drag-active state.

- [ ] **Step 1: Replace icon button color constants**

Replace `src/ui/controls.js` lines 14-17:

```javascript
const ICON_PLAY = `${ICON_BTN_LG} bg-emerald-800 enabled:hover:bg-emerald-700 focus-visible:ring-emerald-500`;
const ICON_PAUSE = `${ICON_BTN_LG} bg-amber-800 enabled:hover:bg-amber-700 focus-visible:ring-amber-500`;
const ICON_STEP = `${ICON_BTN_SM} bg-sky-900 enabled:hover:bg-sky-800 focus-visible:ring-sky-500`;
const ICON_RESET = `${ICON_BTN_SM} bg-red-800 enabled:hover:bg-red-700 focus-visible:ring-red-500`;
```

- [ ] **Step 2: Replace dropzone active-state constant**

Replace `src/ui/uploaders.js` line 9:

```javascript
const DROPZONE_ACTIVE = 'border-accent-rose bg-surface-hover text-ink';
```

(This makes drag-active use the red-pen accent color instead of the structural blue-black `--accent`, per spec's explicit "drag-active = red pen" rule. `border-accent-rose` and `bg-surface-hover`/`text-ink` are existing Tailwind tokens already wired to the CSS custom properties from Task 1 — no new Tailwind config needed.)

- [ ] **Step 3: Run tests**

Run: `npm test -- controls uploaders`
Expected: PASS (`src/test/ui/controls.test.js` — no uploaders test file currently exists per the repo's test directory; if `npm test -- controls uploaders` reports no matching files for "uploaders", run `npm test` instead to confirm the full suite is unaffected)

- [ ] **Step 4: Commit**

```bash
git add src/ui/controls.js src/ui/uploaders.js
git commit -m "style: recolor transport icons and dropzone active state to ink palette"
```

---

### Task 6: Update `index.html` — theme toggle icon and header markup

**Files:**
- Modify: `index.html:20-39` (header block)
- Modify: `src/ui/theme.js:9-15` (`applyTheme` button label)

**Interfaces:**
- Consumes: `--font-headline` custom property from Task 2 (applied via a small utility class or inline style, since Tailwind's `@theme` doesn't currently expose a font-family token)
- Produces: no change to element IDs (`player-toggle`, `theme-toggle`) — `src/main.js` and `src/ui/theme.js` continue to find these elements by the same selectors

- [ ] **Step 1: Add a `font-headline` Tailwind theme token**

In `src/ui/layout.css`, inside the existing `@theme { ... }` block (lines 4-17), add one line:

```css
  --font-family-headline: var(--font-headline);
```

This makes a `font-headline` Tailwind utility class available (Tailwind v4 auto-generates `font-*` utilities from `--font-family-*` theme keys), resolving to the serif stack defined in Task 2.

- [ ] **Step 2: Apply serif to the `<h1>` in `index.html`**

Replace line 22:

```html
        <h1 class="mb-1 font-headline text-2xl font-semibold tracking-tight text-ink">DANN Lab</h1>
```

- [ ] **Step 3: Apply serif to all section headline (`<h2>`) elements in `index.html`**

There are 7 `<h2 class="mb-3 text-base font-semibold uppercase tracking-wider text-muted">` elements at lines 42, 49, 57, 77, 81, 85, 91, and the `<span>` inside the `<summary>` at line 63. Add `font-headline` to each `<h2>` class list and to the `<summary>` `<span>`:

- Line 42: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">1 — Data</h2>`
- Line 49: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">Live Training Math</h2>`
- Line 57: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">Algorithm 1 Step</h2>`
- Line 63: `<span class="font-headline">Architecture</span>`
- Line 77: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">Losses</h2>`
- Line 81: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">Domain Confusion / PAD</h2>`
- Line 85: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">Feature Space</h2>`
- Line 91: `<h2 class="mb-3 font-headline text-base font-semibold uppercase tracking-wider text-muted">2 — Test a New Image</h2>`

- [ ] **Step 4: Update theme toggle button label to fit the paper metaphor**

Replace `src/ui/theme.js` line 12:

```javascript
    buttonEl.textContent = theme === 'light' ? '🌙 Night lamp' : '☀️ Daylight';
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add index.html src/ui/layout.css src/ui/theme.js
git commit -m "style: apply serif headline font across header and section titles"
```

---

### Task 7: Panel/card surface treatment — remove blur, add stacked-sheet shadow

**Files:**
- Modify: `index.html` (all `bg-panel/40 ... backdrop-blur-sm` panel `<section>`/`<div>`/`<details>` elements: lines 41, 48, 56, 61, 76, 80, 84, 90)

**Interfaces:**
- Consumes: `--color-panel`, `--color-border-card` Tailwind tokens
- Produces: no structural change — same element IDs (`setup-panel`, `math-panel`, `algo-tracker`, `network-diagram`, `loss-chart`, `domain-meter`, `feature-scatter`, `test-panel`) consumed by `src/main.js` and viz modules

Per spec: "No backdrop-blur anywhere... depth comes from shadow/stacking." Replace `bg-panel/40 backdrop-blur-sm` with a fully opaque `bg-panel` plus a soft downward drop-shadow utility.

- [ ] **Step 1: Add a reusable `shadow-paper` utility to `src/ui/layout.css`**

Add after the `.hint` rule (after line 60, before `.algo-list`):

```css
.shadow-paper {
  box-shadow: 0 2px 8px rgba(28, 26, 23, 0.12), 0 1px 2px rgba(28, 26, 23, 0.08);
}
:root:not([data-theme='light']) .shadow-paper {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Replace `bg-panel/40 ... backdrop-blur-sm` with `bg-panel ... shadow-paper` on all 8 panel elements in `index.html`**

For each of these lines, remove `backdrop-blur-sm` and change `bg-panel/40` to `bg-panel shadow-paper`:

- Line 41: `<section id="setup-panel" class="rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 48: `<section id="math-panel" class="flex h-[420px] flex-col rounded-xl border border-border-card bg-panel shadow-paper p-6 xl:h-[1308px]">`
- Line 56: `<section id="algo-tracker" class="flex h-[380px] flex-col rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 61: `<details id="network-diagram" open class="group rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 76: `<div id="loss-chart" class="rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 80: `<div id="domain-meter" class="rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 84: `<div id="feature-scatter" class="rounded-xl border border-border-card bg-panel shadow-paper p-6">`
- Line 90: `<section id="test-panel" class="rounded-xl border border-border-card bg-panel shadow-paper p-6">`

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add index.html src/ui/layout.css
git commit -m "style: replace glass-blur panels with opaque paper surface and stacked-sheet shadow"
```

---

### Task 8: Network diagram SVG colors

**Files:**
- Modify: `src/viz/networkDiagram.js:11-16` (`MODULES` array `color` fields), `:70, :90, :108, :113, :139, :159, :167, :185, :194, :205, :219` (edge/label/fill colors)

**Interfaces:**
- Consumes: nothing (self-contained hex literals — D3/SVG doesn't read CSS custom properties for `.attr('fill', ...)` calls, so these must be literal hex values, not `var(--...)`)
- Produces: `createNetworkDiagram(svgEl)` signature and `{ pulse }` return unchanged

- [ ] **Step 1: Recolor module box fills (lines 12-15)**

```javascript
  { id: 'input', title: 'input image', shape: '64x64x3', layers: [], x: 205, y: 20, w: 170, color: '#3a2f26' },
  { id: 'featureExtractor', title: 'G_f  feature extractor', shape: null, layers: FEATURE_LAYERS, x: 140, y: 100, w: 300, color: '#3a2f26' },
  { id: 'labelPredictor', title: 'G_y  label predictor', shape: null, layers: LABEL_LAYERS, x: 20, y: 470, w: 190, color: '#2c4a7c' },
  { id: 'domainClassifier', title: 'G_d  domain classifier', shape: null, layers: DOMAIN_LAYERS, x: 370, y: 500, w: 190, color: '#c0392b' },
```

- [ ] **Step 2: Recolor default edge stroke and arrowhead fill (lines 70, 108)**

Line 70, change the default `stroke` parameter:

```javascript
  function edge(fromId, toId, { dashed = false, stroke = '#8a7d68', label = null, labelId = null } = {}) {
```

Line 108, arrowhead marker fill:

```javascript
    .attr('fill', '#8a7d68');
```

- [ ] **Step 3: Recolor edge label text fill (line 90)**

```javascript
        .attr('fill', '#6b5f4f')
```

- [ ] **Step 4: Recolor the domain-branch dashed edge stroke (line 113)**

```javascript
  edge('grl', 'domainClassifier', { dashed: true, stroke: '#c0392b', label: 'lambda: -  L_d: -', labelId: 'label-dloss' });
```

- [ ] **Step 5: Recolor module title text fill (line 139) and layer-row chip background (line 159) and layer-row text fill (line 167)**

Line 139:

```javascript
    .attr('fill', '#f0e6d6')
```

Line 159:

```javascript
    .attr('fill', 'rgba(240,230,214,0.12)');
```

Line 167:

```javascript
    .attr('fill', '#f0e6d6')
```

- [ ] **Step 6: Recolor GRL badge fill (line 185), badge title text (line 194), badge caption text (line 205)**

Line 185:

```javascript
    .attr('fill', '#8a3f5e')
```

Line 194:

```javascript
    .attr('fill', '#f0e6d6')
```

Line 205:

```javascript
    .attr('fill', '#e0c8d4')
```

- [ ] **Step 7: Recolor the active-step pulse highlight stroke (line 219)**

```javascript
        .attr('stroke', '#c0392b')
```

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS (no test file currently covers `networkDiagram.js` directly per the codebase graph — confirm with `npm test` that the full suite is unaffected)

- [ ] **Step 9: Commit**

```bash
git add src/viz/networkDiagram.js
git commit -m "style: recolor network architecture diagram to ink palette"
```

---

### Task 9: Domain meter bar color, loss chart note, final visual verification, and `DESIGN.md` rewrite

**Files:**
- Modify: `src/main.js:107-108` (domain meter progress bar fill)
- Modify: `DESIGN.md` (full rewrite)
- No modification needed: `src/viz/lossChart.js` — see Step 1 note

**Interfaces:**
- Consumes: nothing new
- Produces: `updateDomainMeter(values)` behavior unchanged, only the bar's fill color class changes

- [ ] **Step 1: Note on `src/viz/lossChart.js` — no code change**

`lossChart.js` renders via `tfvis.render.linechart`, a `@tensorflow/tfjs-vis` built-in that draws its own series colors internally and does not expose a color-override option through the call in this file. This is out of reach for a CSS/token-level pass. Leave `src/viz/lossChart.js` unmodified — flag to the user in the final summary that the loss chart's line colors are library-default and not part of this redesign's color system (a future task could swap to a custom D3/canvas chart if exact palette control is required there).

- [ ] **Step 2: Recolor the domain-confusion meter bar**

Replace `src/main.js` line 108:

```javascript
    <div class="h-full bg-accent-rose" style="width:${confusionPct}%"></div>
```

(Changes from the hardcoded `bg-rose-500` Tailwind color to the `bg-accent-rose` token wired to the theme system in Task 1, so it correctly tracks red-pen across both themes instead of a fixed Tailwind rose value.)

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Production build check**

Run: `npm run build`
Expected: build succeeds with no errors (confirms Tailwind can resolve every utility class referenced across the edited files, including the new `font-headline` and `shadow-paper` utilities)

- [ ] **Step 5: Manual visual verification**

Run: `npm run dev`, open the app in a browser, and check:
- Light mode renders cream paper background with visible grain, serif headers, ink-black body text
- Dark mode ("night desk lamp") renders warm dark-brown background with cream text, same two accent hues recognizable
- Toggling theme switches both correctly and persists on reload (localStorage)
- Transport bar at bottom is a dark ink strip in both themes, icon buttons show distinct muted hues
- Dragging a file over an upload dropzone shows red-pen active state
- Starting a training run (or stepping through) shows the active Algorithm 1 line and active math step both highlighted in red-pen
- Network diagram renders with new ink-toned module boxes and domain-classifier box in red-pen
- No panel shows blur/translucency; all panels show a soft drop shadow instead

- [ ] **Step 6: Rewrite `DESIGN.md`**

Rewrite `DESIGN.md` in full to describe the Paper Lab Journal system as the current source of truth: front-matter colors (paper base, ink text, blue-black-ink accent, red-pen accent, deck/dark tokens matching Task 1/4's final hex values), typography (serif headline, sans body, mono numeric), rounded/spacing values unchanged from current file, and component sections (buttons, chips, cards, inputs, transport deck, navigation) rewritten to match the two-ink system and paper/shadow material described in the spec. Use the spec document (`docs/superpowers/specs/2026-07-23-paper-lab-journal-redesign-design.md`) as the content source — this step transcribes the approved spec into `DESIGN.md`'s existing structure/format, it does not introduce any new design decisions.

- [ ] **Step 7: Commit**

```bash
git add src/main.js DESIGN.md
git commit -m "style: recolor domain meter bar and rewrite DESIGN.md for paper lab journal system"
```
