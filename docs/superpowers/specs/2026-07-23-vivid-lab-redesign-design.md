# Vivid Lab Redesign — Design

## Context

DANN Lab's current "Paper Lab Journal" theme (warm brown/cream palette, serif
headlines, muted steel-blue accent) reads flat and unexciting for a
student-facing ML visualization tool. The floating player bar (transport
controls) is permanently dark regardless of the active page theme, clashing
with the cream light theme and creating a jarring, misaligned-looking strip
at the bottom of the screen.

This redesign replaces the warm "journal" identity with a cooler, more
energetic "app" identity: slate neutrals, a vivid indigo/teal accent system,
sans-serif headlines throughout, and a player bar that is fully theme-aware
instead of visually independent from the rest of the page.

## Goals

- Replace warm brown/cream neutrals with cool slate neutrals in both themes.
- Introduce a vivid two-color accent system: indigo (primary) + teal
  (secondary), replacing the current muted steel-blue accent.
- Refresh the semantic red (`--accent-rose`) to a punchier red consistent
  with the new saturation level.
- Drop the serif headline font in favor of the existing body sans stack.
- Make the player bar fully theme-aware (light theme → light deck, dark
  theme → dark deck) while keeping it visually distinct as an elevated
  "toolbar" surface — not blending flat into the page background.
- Restyle the player bar as a floating rounded card (inset from viewport
  edges, drop shadow) instead of an edge-to-edge bar.
- Move transport button colors off ad hoc Tailwind swatches onto the new
  token system.
- Fix the player bar alignment issue (expand chevron not vertically
  centered against the primary row's icon buttons).
- Remap `networkDiagram.js` module colors to the new palette.

## Non-goals

- No structural/grid layout changes to the page beyond the player bar shape.
- No changes to chart libraries, data flow, or training logic.
- No new features — this is a visual/token-level redesign.

## Palette

### Neutrals (cool slate)

Dark theme (`:root`, default):
- `--bg`: `#0f1115`
- `--panel-bg`: `#161922`
- `--sunken`: `#0b0d11`
- `--border`: `#2a2e3a`
- `--border-card`: `#232733`
- `--text`: `#e6e9f0`
- `--text-dim`: `#8b92a5`
- `--surface`: `#1c2029`
- `--surface-hover`: `#252a35`

Light theme (`:root[data-theme='light']`):
- `--bg`: `#f8fafc`
- `--panel-bg`: `#ffffff`
- `--sunken`: `#eef1f6`
- `--border`: `#dbe0e8`
- `--border-card`: `#e5e9f0`
- `--text`: `#171a21`
- `--text-dim`: `#5b6272`
- `--surface`: `#eef1f6`
- `--surface-hover`: `#e2e6ee`

### Accents

Same values in both themes (accent hues are theme-invariant; only neutrals
flip):
- `--accent`: `#6366f1` (indigo, primary — buttons, links, focus rings,
  active states)
- `--accent-hover`: `#4f46e5` (darker indigo for hover)
- `--accent-secondary`: `#14b8a6` (teal — domain-meter "confused" fill,
  chart highlight, step-forward icon buttons)
- `--accent-rose`: `#ef4444` (refreshed red — GRL diagram node, reset
  button, alerts, "bad" states)

Light theme uses the same accent values (indigo/teal/red already have
enough contrast on white; no separate light-theme accent overrides needed,
matching the existing pattern where only neutrals differ between themes).

### Symbol legend colors (`.sym-*` in `layout.css`)

Existing per-theme symbol colors (`--sym-x`, `--sym-y`, etc., currently only
defined for light theme with dark-theme values inline on `.sym-*` classes)
get adjusted so they read well against the new cool slate backgrounds:
same hue families as today, shifted slightly cooler/less brown-tinted where
needed. `--sym-ld` (domain loss) stays pinned to the new red accent
(`#ef4444`) as the "live" quantity marker, consistent with its current role.

## Typography

`--font-headline` changes from `ui-serif, Georgia, serif` (or similar) to
match the body sans stack: `-apple-system, BlinkMacSystemFont, "Segoe UI",
sans-serif`. Headings (`.font-headline` usages in `index.html`) keep their
existing weight/tracking/uppercase treatment to stay visually distinct from
body text — differentiation now comes from weight and letter-spacing, not
typeface.

## Player Bar

**Shape:** `playerBar.js` changes the container class from edge-to-edge
(`fixed inset-x-0 bottom-0`) to a floating inset card: `fixed inset-x-4
bottom-4` (or similar symmetric inset), `rounded-2xl`, with a drop shadow
(`shadow-lg` / custom shadow token) replacing the current `border-t` +
box-shadow-up treatment. Max-width wrapper (`mx-auto max-w-[1800px]`)
stays, now applied within the inset rather than to a full-width bar.

**Theme-awareness:** The `--deck-*` custom properties in `layout.css`
currently hardcode a permanently-dark appearance
(`--deck-bg-from`/`--deck-bg-to`/`--deck-text` fixed values with only a
light-theme text-color override). These become theme-derived:
- `--deck-bg-from` / `--deck-bg-to`: reference `--panel-bg` / `--surface`
  (or a slightly elevated variant) so the deck follows the page theme.
- `--deck-text`: references `--text`.
- `--deck-border`: references `--border`, with a subtle indigo-tinted glow
  added via `--deck-accent` (already exists) so the bar still reads as a
  distinct, elevated "control deck" surface rather than blending flush into
  the page background. Achieved via a colored border (indigo at partial
  opacity) plus the shadow, not by keeping a separate hardcoded dark
  gradient.
- `--deck-accent` / `--deck-accent-hover`: set to `--accent` / `--accent-hover`
  (indigo) in both themes, tying the deck to the new accent system and
  fixing the original theme-independent brown/cream clash by construction.

**Transport buttons (`controls.js`):** Replace hardcoded Tailwind classes
with new tokens:
- Play / Step-epoch (forward-moving actions): indigo — `bg-[var(--accent)]
  enabled:hover:bg-[var(--accent-hover)]`
- Pause: kept amber (`bg-amber-600 enabled:hover:bg-amber-500`) — retained
  as the one universally-understood "caution/pause" color, deliberately not
  moved onto the indigo/teal/red three-color system.
- Step (single-step): teal — `bg-[var(--accent-secondary)]
  enabled:hover:bg-teal-500`
- Reset: red — `bg-[var(--accent-rose)] enabled:hover:bg-red-500`

Focus ring colors on these buttons update to match their new fill color
family (indigo/teal/amber/red) instead of the current uniform
`--deck-accent`.

**Alignment fix:** The `#player-bar-expand` chevron button in `playerBar.js`
sits in a flex row (`flex items-center gap-4`) alongside `#player-bar-primary`
(which contains the icon-button row from `controls.js`, heights `h-11`/`h-9`).
The chevron uses the shared `CHIP_BTN` class (`h-9 w-9`), which should
already align on `items-center`, so the fix is to verify actual rendered
alignment once the card-shape and floating-inset changes are in — if a
residual misalignment remains (e.g. from the `flex-col gap-2` wrapper
around row1/row2 pushing baseline differently), correct it by ensuring
`#player-bar-primary`'s outer wrapper doesn't introduce extra vertical
padding relative to the chevron's fixed `h-9`.

## Network Diagram (`networkDiagram.js`)

Module fill colors remap from the current brown/blue/red set to the new
palette:
- `input` module: `#232733` (slate, matches `--border-card`)
- `featureExtractor` module: `#232733` (slate)
- `labelPredictor` module: `#6366f1` (indigo)
- `domainClassifier` module: `#ef4444` (red)
- GRL badge: `#7c3aed` (violet — distinct from both indigo and red, keeps
  its role as a visually separate "special operation" node)

Edge stroke colors (`#8a7d68` default, `#c0392b` domain-branch dashed edge,
label text `#6b5f4f`) update to slate-gray (`#5b6272`, matching
`--text-dim`) for default edges and the new red (`#ef4444`) for the
domain-branch dashed edge, keeping the existing visual pattern (domain
branch stands out via color + dash) intact.

## Testing

- Visual check in both light and dark theme via dev server: page load,
  toggle theme button, confirm player bar recolors correctly and no
  layout shift/misalignment.
- Confirm player bar floating-card shape renders correctly on toggling
  visible/hidden and expanded/collapsed states.
- Confirm existing Tailwind `@theme` token mapping in `layout.css` still
  resolves (no renamed CSS custom properties break the `@theme` block's
  `--color-*` → `var(--*)` references).
- Run `npm run build` to confirm no build errors after CSS/token changes.
- No unit tests are affected (this is a pure styling change); no new tests
  required.
