# Training Controls Media-Player Overlay — Design

## Goal
Convert the inline "2 — Training Controls" panel into a fixed, media-player-style
overlay bar pinned to the bottom of the viewport, toggleable from the top header.
Give it a distinct vibrant "control deck" visual identity, contrasting the rest of
the app's muted Dark Lab Notebook theme.

## Architecture
- **New module** `src/ui/playerBar.js` exports `initPlayerBar(containerEl, { onToggleVisibility })`.
  - Builds the fixed-bottom bar chrome: row 1 (always visible) + row 2 (collapsible,
    collapsed by default), an expand/collapse chevron control, and mounts the
    existing training controls into two sub-containers.
  - Returns a handle: `{ setVisible(bool), isVisible(), toggleExpanded(), updateStats(values), enable() }`
    (delegates stats/enable to the underlying `initControls` handle).
- **`src/ui/controls.js`** (minimal change): `initControls(primaryEl, secondaryEl, callbacks)`
  — accepts two mount points instead of one, so playerBar can place transport
  controls/speed/key stats in row 1 and mode/overrides/tutorial/remaining stats in
  row 2. All existing callback wiring and behavior (disabled-until-enable, stat
  formatting, override toggles) stays unchanged — only the markup is split across
  two containers.
- **`index.html`**: remove the "2 — Training Controls" `<section>` entirely; renumber
  "3 — Test a New Image" to "2 — Test a New Image". Add `#player-toggle` button in
  `<header>`, next to the existing theme toggle. Add `#player-bar` mount container
  (fixed, outside the normal `#app` flow or as a direct child of `<body>`).
- **`main.js`**: import and call `initPlayerBar` instead of `initControls` directly;
  wire `#player-toggle` click to `playerBar.setVisible(!playerBar.isVisible())`.

## Layout & Visual Design
- `#player-bar`: `position: fixed; inset-inline: 0; bottom: 0; z-index: 50`.
  Vivid "control deck" styling distinct from the muted app: saturated
  gradient/solid background, high-contrast accent color for the Play button,
  colored stat chips (epoch/step/lambda/mu/val-acc/domain-acc/PAD each get a
  distinct swatch color). This is the one deliberately colorful surface in the
  app per user direction — the rest of the app keeps its existing muted theme.
- **Row 1** (always visible): Play/Pause/Step/Step-epoch/Reset transport buttons
  (larger, icon-forward, media-player styled), speed slider, key live stats
  (epoch, step, val-acc), expand/collapse chevron button (far right).
- **Row 2** (collapsible, collapsed by default on load): mode radios (DANN/Plain),
  tutorial toggle + Next button, lambda/mu override toggles + sliders, remaining
  stats (lambda, mu, domain-acc, PAD).
- Body reserves `padding-bottom` equal to the bar's **maximum** height (row 1 +
  row 2 expanded), applied unconditionally — content never jumps or hides
  under the bar regardless of expand/collapse state.

## Show/Hide Toggle
- Header button `#player-toggle`, `aria-pressed` reflects current visibility,
  label swaps "Hide Controls" / "Show Controls".
- **Default: visible on page load.**
- Hidden state: bar slides off-screen via `translate-y-full` + CSS transition;
  `visibility: hidden` applied after the transition completes to remove it from
  the tab order. Body `padding-bottom` collapses to 0 when hidden, restores when
  shown.
- Visibility state is not persisted across reloads — always defaults to visible
  (unlike the theme toggle, which does persist).

## Testing
- New `src/test/ui/playerBar.test.js` (vitest + jsdom):
  - Bar is visible by default on init.
  - Toggle hides the bar (checks hidden state/class + `aria-pressed`).
  - Toggle shows it again.
  - Row 2 is collapsed by default.
  - Expand chevron reveals row 2 and toggles `aria-expanded`.
  - Transport buttons remain disabled until `enable()` is called (existing
    controls.js behavior, verified through the new split mount points).
  - Callbacks (play/pause/step/reset/etc.) still fire correctly through the
    split-container `initControls`.
- No browser/e2e testing in this pass (explicitly out of scope).

## Out of Scope
- Persisting bar visibility across reloads.
- Playwright/browser e2e tests.
- Colorizing the rest of the app beyond the player bar.
