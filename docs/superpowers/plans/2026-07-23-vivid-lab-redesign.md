# Vivid Lab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm brown/cream "Paper Lab Journal" theme with cool slate neutrals and a vivid indigo/teal accent system, refresh the semantic red, drop serif headlines, and make the player bar theme-aware and correctly aligned instead of permanently dark and clashing.

**Architecture:** This is a pure CSS-custom-property and Tailwind-class-level redesign — no component structure, data flow, or logic changes. Work proceeds token-layer-first (neutrals → accents → typography in `layout.css`), then consumers of those tokens (player bar shape/theme-awareness, transport button colors, network diagram colors).

**Tech Stack:** Vite, Tailwind CSS v4 (`@theme` directive mapping CSS custom properties to utility classes), vanilla JS DOM manipulation, D3 (network diagram SVG).

## Global Constraints

- Dark theme (default, `:root`) neutrals: `--bg: #0f1115`, `--panel-bg: #161922`, `--sunken: #0b0d11`, `--border: #2a2e3a`, `--border-card: #232733`, `--text: #e6e9f0`, `--text-dim: #8b92a5`, `--surface: #1c2029`, `--surface-hover: #252a35`.
- Light theme (`:root[data-theme='light']`) neutrals: `--bg: #f8fafc`, `--panel-bg: #ffffff`, `--sunken: #eef1f6`, `--border: #dbe0e8`, `--border-card: #e5e9f0`, `--text: #171a21`, `--text-dim: #5b6272`, `--surface: #eef1f6`, `--surface-hover: #e2e6ee`.
- Accents (same values in both themes): `--accent: #6366f1`, `--accent-hover: #4f46e5`, `--accent-secondary: #14b8a6`, `--accent-rose: #ef4444`.
- `--font-headline` becomes `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (matches existing body font stack).
- Player bar container: floating rounded card (`rounded-2xl`, inset from viewport edges, drop shadow) instead of edge-to-edge bar.
- Player bar `--deck-*` tokens derive from theme tokens (`--panel-bg`/`--surface`/`--text`/`--border`) instead of hardcoded dark values; `--deck-accent`/`--deck-accent-hover` map to `--accent`/`--accent-hover`.
- Transport buttons: play/step-epoch → indigo (`--accent`), step → teal (`--accent-secondary`), pause → amber (kept, `bg-amber-600`/`hover:bg-amber-500`), reset → red (`--accent-rose`).
- Network diagram module fills: input/featureExtractor → `#232733`, labelPredictor → `#6366f1`, domainClassifier → `#ef4444`, GRL badge → `#7c3aed`. Default edges → `#5b6272`, domain-branch dashed edge → `#ef4444`.
- No unit tests exist for these files (pure CSS/DOM styling, no logic under test) — verification is `npm run build` succeeding plus manual visual check in the dev server, per the spec's Testing section.

---

### Task 1: Neutral and accent token overhaul in `layout.css`

**Files:**
- Modify: `src/ui/layout.css:1-54` (Tailwind `@theme` mapping and both `:root` token blocks)

**Interfaces:**
- Consumes: nothing (this is the root token layer).
- Produces: CSS custom properties `--bg`, `--panel-bg`, `--sunken`, `--border`, `--border-card`, `--text`, `--text-dim`, `--accent`, `--accent-hover`, `--accent-secondary`, `--accent-rose`, `--surface`, `--surface-hover`, `--font-headline`, consumed by Tasks 2-5 and by all existing Tailwind utility classes (`bg-canvas`, `text-ink`, etc., which already map to these vars via `@theme`).

- [ ] **Step 1: Add `--color-accent-secondary` to the Tailwind `@theme` mapping**

Read current content first if not already in context, then edit `src/ui/layout.css` lines 4-18 from:

```css
@theme {
  --color-canvas: var(--bg);
  --color-panel: var(--panel-bg);
  --color-border: var(--border);
  --color-border-card: var(--border-card);
  --color-ink: var(--text);
  --color-muted: var(--text-dim);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-rose: var(--accent-rose);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-sunken: var(--sunken);
  --font-family-headline: var(--font-headline);
}
```

to:

```css
@theme {
  --color-canvas: var(--bg);
  --color-panel: var(--panel-bg);
  --color-border: var(--border);
  --color-border-card: var(--border-card);
  --color-ink: var(--text);
  --color-muted: var(--text-dim);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-secondary: var(--accent-secondary);
  --color-accent-rose: var(--accent-rose);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-sunken: var(--sunken);
  --font-family-headline: var(--font-headline);
}
```

- [ ] **Step 2: Replace dark theme (`:root`) neutral and accent values**

Edit `src/ui/layout.css` lines 20-34 from:

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

to:

```css
:root {
  --bg: #0f1115;
  --panel-bg: #161922;
  --sunken: #0b0d11;
  --border: #2a2e3a;
  --border-card: #232733;
  --text: #e6e9f0;
  --text-dim: #8b92a5;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-secondary: #14b8a6;
  --accent-rose: #ef4444;
  --surface: #1c2029;
  --surface-hover: #252a35;
  color-scheme: dark;
}
```

- [ ] **Step 3: Replace light theme (`:root[data-theme='light']`) neutral values, keep accents identical**

Edit `src/ui/layout.css` lines 36-50 from:

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

to:

```css
:root[data-theme='light'] {
  --bg: #f8fafc;
  --panel-bg: #ffffff;
  --sunken: #eef1f6;
  --border: #dbe0e8;
  --border-card: #e5e9f0;
  --text: #171a21;
  --text-dim: #5b6272;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-secondary: #14b8a6;
  --accent-rose: #ef4444;
  --surface: #eef1f6;
  --surface-hover: #e2e6ee;
  color-scheme: light;
}
```

- [ ] **Step 4: Switch headline font from serif to sans**

Edit `src/ui/layout.css` lines 52-54 from:

```css
:root {
  --font-headline: ui-serif, Georgia, 'Times New Roman', serif;
}
```

to:

```css
:root {
  --font-headline: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 5: Verify the build compiles with the new tokens**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors (warnings about chunk size or KaTeX font copying are pre-existing and benign).

- [ ] **Step 6: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/ui/layout.css
git commit -m "feat: replace warm brown/cream tokens with cool slate + indigo/teal accents"
```

---

### Task 2: Symbol legend, algo-list, and math-panel color updates in `layout.css`

**Files:**
- Modify: `src/ui/layout.css:83-191` (`.algo-list`, `.sym-*` classes, `.math-step.active-step`)

**Interfaces:**
- Consumes: `--accent-rose` (now `#ef4444`), `--accent` (now `#6366f1`) from Task 1.
- Produces: updated `.sym-*` symbol colors and `.algo-list li.active-line` / `.math-step.active-step` accent highlight colors, consumed only by inline HTML rendered from `mathContent.js` / `algoTracker.js` (not modified in this plan — they emit class names like `sym-x`, this file supplies the color).

- [ ] **Step 1: Update dark-theme `.sym-*` colors to sit well against the new cool slate background**

Edit `src/ui/layout.css` lines 105-122 from:

```css
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

to:

```css
.sym-x { color: #8fb0d9; }
.sym-y { color: #86efac; }
.sym-d { color: #fcd34d; }
.sym-gf { color: #5eead4; }
.sym-thetaf { color: #67e8f9; }
.sym-h { color: #a5b4fc; }
.sym-gy { color: #8fb0d9; }
.sym-thetay { color: #93c5fd; }
.sym-ly { color: #818cf8; }
.sym-gd { color: #f0abfc; }
.sym-thetad { color: #fdba74; }
.sym-ld { color: #ef4444; }
.sym-grl { color: #c4b5fd; }
.sym-lambda { color: #d8b4fe; }
.sym-mu { color: #fca5a5; }
.sym-hclass { color: #8b92a5; }
.sym-epsilon { color: #fde68a; }
.sym-pad { color: #5eead4; }
```

- [ ] **Step 2: Update light-theme `.sym-*` colors (the `--sym-*` variable block)**

Edit `src/ui/layout.css` lines 124-143 from:

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

to:

```css
:root[data-theme='light'] {
  --sym-x: #4338ca;
  --sym-y: #15803d;
  --sym-d: #a16207;
  --sym-gf: #0f766e;
  --sym-thetaf: #0e7490;
  --sym-h: #4338ca;
  --sym-gy: #4338ca;
  --sym-thetay: #1d4ed8;
  --sym-ly: #4338ca;
  --sym-gd: #a21caf;
  --sym-thetad: #b45309;
  --sym-ld: #dc2626;
  --sym-grl: #6d28d9;
  --sym-lambda: #7e22ce;
  --sym-mu: #b91c1c;
  --sym-hclass: #5b6272;
  --sym-epsilon: #a16207;
  --sym-pad: #0f766e;
}
```

- [ ] **Step 3: Update `.algo-list li.active-line` highlight (uses `--accent-rose`, already `#ef4444` from Task 1 — no value change needed, verify only)**

Read `src/ui/layout.css` line 85 and confirm it still reads:

```css
.algo-list li.active-line { background: rgba(192, 57, 43, 0.12); color: var(--text); box-shadow: inset 3px 0 0 var(--accent-rose); }
```

The `box-shadow` already references `var(--accent-rose)` so it auto-updates from Task 1. Update only the hardcoded `rgba(192, 57, 43, 0.12)` background tint to match the new red (`#ef4444` = `rgb(239, 68, 68)`):

Edit line 85 from:

```css
.algo-list li.active-line { background: rgba(192, 57, 43, 0.12); color: var(--text); box-shadow: inset 3px 0 0 var(--accent-rose); }
```

to:

```css
.algo-list li.active-line { background: rgba(239, 68, 68, 0.12); color: var(--text); box-shadow: inset 3px 0 0 var(--accent-rose); }
```

- [ ] **Step 4: Update `.math-step.active-step` highlight tint to match new indigo accent**

Edit `src/ui/layout.css` lines 163-166 from:

```css
.math-step.active-step {
  background: rgba(44, 74, 124, 0.08);
  box-shadow: inset 3px 0 0 var(--accent);
}
```

to:

```css
.math-step.active-step {
  background: rgba(99, 102, 241, 0.08);
  box-shadow: inset 3px 0 0 var(--accent);
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/ui/layout.css
git commit -m "style: update symbol legend and highlight tints for new accent palette"
```

---

### Task 3: Theme-aware, floating-card player bar deck tokens in `layout.css`

**Files:**
- Modify: `src/ui/layout.css:193-225` (`--deck-*` token block, comment above it)

**Interfaces:**
- Consumes: `--panel-bg`, `--surface`, `--text`, `--border`, `--accent`, `--accent-hover` from Task 1 (all theme-derived now).
- Produces: `--deck-bg-from`, `--deck-bg-to`, `--deck-text`, `--deck-border`, `--deck-accent`, `--deck-accent-hover`, `--deck-chip-*` (unchanged chip colors — theme-invariant per existing pattern, left as-is), consumed by Task 4 (`playerBar.js`, `controls.js`).

- [ ] **Step 1: Replace the control-deck comment and hardcoded dark-only token block with theme-derived tokens**

Edit `src/ui/layout.css` lines 193-211 from:

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
```

to:

```css
/* Control-deck: the training-controls player bar, styled as a floating
   elevated toolbar card. Follows the active page theme (light/dark) via
   --panel-bg/--surface/--text/--border so it never clashes with the page,
   but stays visually distinct as an elevated surface via --surface (one
   step lighter/darker than --panel-bg) plus a shadow and an indigo-tinted
   border, tying it to the accent system. Chip accent colors stay
   theme-invariant for legibility against the deck surface in both themes. */
:root {
  --deck-bg-from: var(--surface);
  --deck-bg-to: var(--panel-bg);
  --deck-text: var(--text);
  --deck-border: color-mix(in srgb, var(--accent) 35%, var(--border));
  --deck-accent: var(--accent);
  --deck-accent-hover: var(--accent-hover);
  --deck-chip-epoch: #8fb0d9;
  --deck-chip-step: #9ecb8f;
  --deck-chip-valacc: #8fcba3;
  --deck-chip-lambda: #c9a8e0;
  --deck-chip-mu: #d98f8f;
  --deck-chip-domainacc: #e0c068;
  --deck-chip-pad: #d9a778;
}
```

- [ ] **Step 2: Remove the now-redundant light-theme deck override block**

The light-theme block previously existed only to override the permanently-dark deck's text color for legibility. Since `--deck-bg-from`/`--deck-bg-to`/`--deck-text`/`--deck-border` are now `var(--panel-bg)`/`var(--surface)`/`var(--text)`/`var(--border)`-derived, they already flip automatically with the theme — this block is no longer needed.

Edit `src/ui/layout.css` lines 213-218 from:

```css
:root[data-theme='light'] {
  --deck-bg-from: #1c1a17;
  --deck-bg-to: #1c1a17;
  --deck-text: #f5f0e6;
  --deck-border: rgba(245, 240, 230, 0.12);
}
```

to: (delete the block entirely — replace with nothing, leaving the `#player-bar` rule that follows it as the next content)

- [ ] **Step 3: Verify the build compiles**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors. `color-mix()` is supported by all evergreen browsers Vite/Tailwind v4 targets by default; no build-time processing issue expected since this is a runtime CSS function, not a build-time one.

- [ ] **Step 4: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/ui/layout.css
git commit -m "feat: make player bar deck tokens theme-aware instead of permanently dark"
```

---

### Task 4: Floating rounded player bar shape and alignment fix in `playerBar.js`

**Files:**
- Modify: `src/ui/playerBar.js:10-29`

**Interfaces:**
- Consumes: `--deck-bg-from`, `--deck-bg-to`, `--deck-text`, `--deck-border`, `--deck-accent` from Task 3.
- Produces: no interface change — `initPlayerBar(containerEl, callbacks)` keeps its existing signature and return shape (`{ setVisible, isVisible, enable, updateStats, els }`), consumed unchanged by `src/main.js:73-98`.

- [ ] **Step 1: Change container class from edge-to-edge bar to floating inset rounded card**

Edit `src/ui/playerBar.js` line 12 from:

```javascript
  containerEl.className = `${containerEl.className} fixed inset-x-0 bottom-0 z-50 border-t border-[var(--deck-border)] bg-gradient-to-r from-[var(--deck-bg-from)] to-[var(--deck-bg-to)] text-[var(--deck-text)] px-6 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`.trim();
```

to:

```javascript
  containerEl.className = `${containerEl.className} fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-[var(--deck-border)] bg-gradient-to-r from-[var(--deck-bg-from)] to-[var(--deck-bg-to)] text-[var(--deck-text)] px-6 py-3 shadow-xl`.trim();
```

- [ ] **Step 2: Fix expand-chevron vertical alignment against the primary control row**

The chevron (`CHIP_BTN`, fixed `h-9 w-9`) sits in a `flex items-center gap-4` row next to `#player-bar-primary` (`flex-1`), which contains `controls.js`'s `flex flex-col gap-2.5` block — the first child of that column is the icon-button row (`h-11` play/pause buttons). `items-center` on the outer row centers the chevron against the *whole* `flex-1` column's height (which grows with speed slider / stats rows below), not just the icon-button row, producing the visual misalignment.

Fix by giving the chevron `self-start` and a small top margin matching the icon-row's vertical center, so it aligns with the icon-button row instead of the full column height.

Edit `src/ui/playerBar.js` line 8 from:

```javascript
const CHIP_BTN = 'flex items-center justify-center rounded-full h-9 w-9 text-lg text-[var(--deck-text)] transition-colors enabled:hover:bg-[color-mix(in_srgb,var(--deck-text)_15%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deck-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';
```

to:

```javascript
const CHIP_BTN = 'flex items-center justify-center self-start mt-1 rounded-full h-9 w-9 text-lg text-[var(--deck-text)] transition-colors enabled:hover:bg-[color-mix(in_srgb,var(--deck-text)_15%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deck-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Manual visual check in the dev server**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run dev` (use a free port if 5173 is occupied, e.g. `npm run dev -- --port 5180`)

Open the printed local URL in a browser. Confirm:
- The player bar renders as a floating rounded card inset from the screen edges, not an edge-to-edge bar.
- The expand chevron (▾) aligns vertically with the top icon-button row, not floating mid-height of the whole expanded column.
- Toggling the theme button flips the player bar between light and dark colors matching the page.
- Toggling the chevron expands/collapses the secondary row without layout jump.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/ui/playerBar.js
git commit -m "style: float player bar as rounded inset card, fix chevron alignment"
```

---

### Task 5: Transport button and focus-ring color tokens in `controls.js`

**Files:**
- Modify: `src/ui/controls.js:11-18`

**Interfaces:**
- Consumes: `--accent`, `--accent-secondary`, `--accent-rose` from Task 1; `--deck-bg-to` from Task 3 (used in `focus-visible:ring-offset-[var(--deck-bg-to)]`, unchanged reference).
- Produces: no interface change — `initControls(primaryEl, secondaryEl, callbacks)` keeps its existing signature and return shape (`{ enable, updateStats, els }`), consumed unchanged by `src/ui/playerBar.js:35` and `src/main.js:73-91` (via `controlsHandle`).

- [ ] **Step 1: Replace hardcoded Tailwind swatch classes with token-based colors for play/pause/step/reset icon buttons**

Edit `src/ui/controls.js` lines 11-17 from:

```javascript
const ICON_BTN_BASE = 'flex items-center justify-center rounded-full transition-colors text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';
const ICON_BTN_LG = `${ICON_BTN_BASE} h-11 w-11 text-xl`;
const ICON_BTN_SM = `${ICON_BTN_BASE} h-9 w-9 text-base`;
const ICON_PLAY = `${ICON_BTN_LG} bg-emerald-800 enabled:hover:bg-emerald-700 focus-visible:ring-emerald-500`;
const ICON_PAUSE = `${ICON_BTN_LG} bg-amber-800 enabled:hover:bg-amber-700 focus-visible:ring-amber-500`;
const ICON_STEP = `${ICON_BTN_SM} bg-sky-900 enabled:hover:bg-sky-800 focus-visible:ring-sky-500`;
const ICON_RESET = `${ICON_BTN_SM} bg-red-800 enabled:hover:bg-red-700 focus-visible:ring-red-500`;
```

to:

```javascript
const ICON_BTN_BASE = 'flex items-center justify-center rounded-full transition-colors text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';
const ICON_BTN_LG = `${ICON_BTN_BASE} h-11 w-11 text-xl`;
const ICON_BTN_SM = `${ICON_BTN_BASE} h-9 w-9 text-base`;
const ICON_PLAY = `${ICON_BTN_LG} bg-[var(--accent)] enabled:hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)]`;
const ICON_PAUSE = `${ICON_BTN_LG} bg-amber-600 enabled:hover:bg-amber-500 focus-visible:ring-amber-500`;
const ICON_STEP = `${ICON_BTN_SM} bg-[var(--accent-secondary)] enabled:hover:bg-teal-500 focus-visible:ring-[var(--accent-secondary)]`;
const ICON_RESET = `${ICON_BTN_SM} bg-[var(--accent-rose)] enabled:hover:bg-red-500 focus-visible:ring-[var(--accent-rose)]`;
```

Note: `ICON_STEP` is shared between the "Step" and "Step epoch" buttons (`btn-step` and `btn-step-epoch`, both use `ICON_STEP` per the existing markup at lines 25 and 28) — both become teal, matching the Global Constraints' "step → teal" rule for single-step actions; step-epoch is also a step-forward action so it takes the same teal treatment rather than indigo, keeping play (the only "run" action) as the sole indigo button.

- [ ] **Step 2: Verify the build compiles**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manual visual check in the dev server**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run dev -- --port 5180`

Upload a dataset (or use whatever fixture data is available) to enable the transport controls, or just confirm the disabled-state button colors render correctly if no dataset is on hand. Confirm:
- Play button is indigo.
- Pause button is amber.
- Step and Step-epoch buttons are teal.
- Reset button is red.
- Focus ring color (tab to each button) matches each button's own color family.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/ui/controls.js
git commit -m "style: move transport button colors onto indigo/teal/amber/red token system"
```

---

### Task 6: Network diagram color remap in `networkDiagram.js`

**Files:**
- Modify: `src/viz/networkDiagram.js:11-16` (module fill colors), `src/viz/networkDiagram.js:70-94` (edge stroke/label colors), `src/viz/networkDiagram.js:181-208` (GRL badge fill/text)

**Interfaces:**
- Consumes: nothing (hardcoded hex values only — this file doesn't read CSS custom properties since it's D3-driven SVG attribute setting, not class-based styling).
- Produces: no interface change — `createNetworkDiagram(svgEl)` keeps its existing signature and return shape (`{ pulse }`), consumed unchanged by `src/main.js:45` and `src/main.js:61`.

- [ ] **Step 1: Update the `MODULES` array fill colors**

Edit `src/viz/networkDiagram.js` lines 11-16 from:

```javascript
const MODULES = [
  { id: 'input', title: 'input image', shape: '64x64x3', layers: [], x: 205, y: 20, w: 170, color: '#3a2f26' },
  { id: 'featureExtractor', title: 'G_f  feature extractor', shape: null, layers: FEATURE_LAYERS, x: 140, y: 100, w: 300, color: '#3a2f26' },
  { id: 'labelPredictor', title: 'G_y  label predictor', shape: null, layers: LABEL_LAYERS, x: 20, y: 470, w: 190, color: '#2c4a7c' },
  { id: 'domainClassifier', title: 'G_d  domain classifier', shape: null, layers: DOMAIN_LAYERS, x: 370, y: 500, w: 190, color: '#c0392b' },
];
```

to:

```javascript
const MODULES = [
  { id: 'input', title: 'input image', shape: '64x64x3', layers: [], x: 205, y: 20, w: 170, color: '#232733' },
  { id: 'featureExtractor', title: 'G_f  feature extractor', shape: null, layers: FEATURE_LAYERS, x: 140, y: 100, w: 300, color: '#232733' },
  { id: 'labelPredictor', title: 'G_y  label predictor', shape: null, layers: LABEL_LAYERS, x: 20, y: 470, w: 190, color: '#6366f1' },
  { id: 'domainClassifier', title: 'G_d  domain classifier', shape: null, layers: DOMAIN_LAYERS, x: 370, y: 500, w: 190, color: '#ef4444' },
];
```

- [ ] **Step 2: Update default and pulsed edge stroke colors, and the arrowhead marker fill**

Edit `src/viz/networkDiagram.js` line 70 (the `edge()` function's default parameter) from:

```javascript
  function edge(fromId, toId, { dashed = false, stroke = '#8a7d68', label = null, labelId = null } = {}) {
```

to:

```javascript
  function edge(fromId, toId, { dashed = false, stroke = '#5b6272', label = null, labelId = null } = {}) {
```

Edit the edge label text color inside that same function — line 90 — from:

```javascript
        .attr('fill', '#6b5f4f')
```

to:

```javascript
        .attr('fill', '#8b92a5')
```

Edit the arrowhead marker fill — line 108 — from:

```javascript
    .attr('fill', '#8a7d68');
```

to:

```javascript
    .attr('fill', '#5b6272');
```

- [ ] **Step 3: Update the domain-branch dashed edge color and GRL badge colors**

Edit `src/viz/networkDiagram.js` line 113 (the domain-branch edge call, which passes an explicit `stroke` override) from:

```javascript
  edge('grl', 'domainClassifier', { dashed: true, stroke: '#c0392b', label: 'lambda: -  L_d: -', labelId: 'label-dloss' });
```

to:

```javascript
  edge('grl', 'domainClassifier', { dashed: true, stroke: '#ef4444', label: 'lambda: -  L_d: -', labelId: 'label-dloss' });
```

Edit the GRL badge rect fill — line 185 — from:

```javascript
    .attr('fill', '#8a3f5e')
```

to:

```javascript
    .attr('fill', '#7c3aed')
```

Edit the GRL badge caption text fill — line 205 — from:

```javascript
    .style('font-size', '9.5px')
    .style('font-family', 'monospace')
    .text(GRL.caption);
```

Note: this text fill is set two lines earlier at line 205's preceding `.attr('fill', '#e0c8d4')`. Edit that line from:

```javascript
    .attr('fill', '#e0c8d4')
```

to:

```javascript
    .attr('fill', '#ddd6fe')
```

- [ ] **Step 4: Update the `pulse()` function's active-node stroke color to match the new red**

Edit `src/viz/networkDiagram.js` lines 218-221 from:

```javascript
    if (nodeId) {
      svg
        .select(`#node-${nodeId}`)
        .attr('stroke', '#c0392b')
        .attr('stroke-width', 3);
    }
```

to:

```javascript
    if (nodeId) {
      svg
        .select(`#node-${nodeId}`)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 3);
    }
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Manual visual check in the dev server**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run dev -- --port 5180`

Open the Architecture panel (network diagram). Confirm:
- Input and feature-extractor boxes render dark slate.
- Label-predictor box renders indigo.
- Domain-classifier box renders red.
- GRL badge renders violet.
- Default edges render slate-gray; the domain-branch dashed edge renders red.

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal"
git add src/viz/networkDiagram.js
git commit -m "style: remap network diagram colors to new slate/indigo/red/violet palette"
```

---

### Task 7: Full-page visual QA pass across both themes

**Files:**
- None modified — verification-only task. May produce follow-up fix commits to any file touched in Tasks 1-6 if issues are found.

**Interfaces:**
- Consumes: the complete redesigned app (all tokens and components from Tasks 1-6).
- Produces: nothing new — this task's deliverable is a confirmed-working app, or a list of concrete fixes applied inline.

- [ ] **Step 1: Run a full production build**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 2: Start the dev server and walk through both themes**

Run: `cd "/Users/farhad/Documents/DANN LIVE/.worktrees/paper-lab-journal" && npm run dev -- --port 5180`

In the browser, with dark theme active (default):
- Confirm page background, panels, and text use the new cool slate colors (no leftover brown/cream anywhere).
- Confirm all headings render in the sans-serif font (no serif remnants).
- Confirm the player bar floats as a rounded card with a dark deck matching the dark theme, indigo-tinted border, and correctly aligned chevron.
- Confirm transport buttons show indigo/amber/teal/red as specified.
- Upload a dataset (if fixtures are available) and confirm training controls, loss chart, domain meter, feature scatter, and network diagram all render with the new palette and no broken/illegible text.

Toggle the theme button to switch to light theme, repeat the same checks:
- Confirm page uses the new near-white slate colors.
- Confirm the player bar deck flips to a light appearance matching the page (this is the core clash fix — confirm it no longer looks like a dark bar dropped onto a light page).
- Confirm text contrast is legible throughout (headings, body, chips, math panel).

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 3: Fix any issues found inline**

If any color, contrast, or alignment issue is found during Step 2, fix it directly in the relevant file from Tasks 1-6 (`layout.css`, `playerBar.js`, `controls.js`, or `networkDiagram.js`) and re-run Step 1 and the relevant portion of Step 2 to confirm the fix. Commit each fix separately with a `fix:` commit message describing exactly what was wrong and what changed.

- [ ] **Step 4: Final commit (only if Step 3 produced no changes needing a separate commit, otherwise skip — fixes were already committed in Step 3)**

No action needed if all checks in Step 2 passed without requiring fixes — Task 6's commit is the final state.
