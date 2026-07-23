---
name: DANN Lab
description: Live domain-adversarial training, run and narrated in the browser
colors:
  paper-cream: "#f5f0e6"
  panel-cream: "#faf6ec"
  sunken-cream: "#ece4d4"
  border-tan: "#d8cdb8"
  border-card-tan: "#e3d9c4"
  ink-near-black: "#1c1a17"
  ink-dim-brown: "#6b5f4f"
  blue-black-ink: "#2c4a7c"
  blue-black-ink-hover: "#1e3660"
  red-pen: "#c0392b"
  surface-cream: "#ece4d4"
  surface-cream-hover: "#ddd0b5"
  night-bg: "#1a1512"
  night-panel: "#241d18"
  night-sunken: "#14100d"
  night-border: "#3a2f26"
  night-border-card: "#2e2620"
  night-text: "#f0e6d6"
  night-text-dim: "#b3a390"
  night-blue-black-ink: "#6b8cc0"
  night-blue-black-ink-hover: "#8ba8d4"
  night-red-pen: "#e0574a"
  night-surface: "#2e2620"
  night-surface-hover: "#3a2f26"
  deck-ink: "#14100d"
  deck-text: "#f0e6d6"
  transport-play: "#065f46"
  transport-pause: "#92400e"
  transport-step: "#0c4a6e"
  transport-reset: "#7f1d1d"
typography:
  headline:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  label:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.05em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.paper-cream}"
    borderColor: "{colors.blue-black-ink}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.surface-cream-hover}"
  button-transport-play:
    backgroundColor: "{colors.transport-play}"
    textColor: "{colors.deck-text}"
    rounded: "{rounded.full}"
    size: "44px"
  button-transport-reset:
    backgroundColor: "{colors.transport-reset}"
    textColor: "{colors.deck-text}"
    rounded: "{rounded.full}"
    size: "36px"
  card-panel:
    backgroundColor: "{colors.panel-cream}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-sunken:
    backgroundColor: "{colors.sunken-cream}"
    textColor: "{colors.ink-near-black}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: DANN Lab

## Overview

**Creative North Star: "The Paper Lab Journal"**

DANN Lab reads as an annotated physical lab notebook — cream paper pages under study, ink typography, a red-pen hand marking up what's happening right now, and blue-black ink used for the notebook's own structural notation. The mood is warm, tactile, and hand-annotated rather than digital-instrument: the app looks like a researcher's open notebook mid-experiment, not a screen. Color is spent almost entirely on function: a symbol legend that must stay distinct across a dozen math variables, a red-pen highlight that marks the exact line of Algorithm 1 executing right now, and a five-button transport deck (play/pause/step/reset) styled as a dark ink ruler laid across the bottom of the page.

Confirmed anti-reference: no generic SaaS gradient dashboard, no glass/blur "dark instrument panel" treatment (the prior design direction). This is a lab notebook, not a marketing surface or a control room.

**Key Characteristics:**
- Warm cream paper canvas with a faint grain texture — never a bright or branded background, never near-black glass.
- Exactly two reserved accent inks: blue-black (structural/semantic, calm) and red pen (live/active, urgent). Everything else stays paper-neutral.
- Color is semantic before it is decorative — math symbols, active-step highlighting, and transport actions each claim their own hue and never borrow another's.
- Depth comes from soft stacked-sheet shadows, not translucency or blur. No backdrop-blur anywhere in the interface.

## Colors

The palette is a warm paper neutral punctuated by two deliberate accent inks (blue-black, red pen), plus a wider hue set — retuned into the same warm-paper family — reserved for the math symbol legend and transport deck, where distinctness under simultaneous display matters more than restraint.

### Primary
- **Blue-Black Ink** (`#2c4a7c` light / `#6b8cc0` dark): the interface's structural accent — focus rings, links, section eyebrow accents, the `G_y`/label-predictor branch in the architecture diagram and symbol legend, static/semantic (not live) highlighting.

### Secondary
- **Red Pen** (`#c0392b` light / `#e0574a` dark): reserved for "this is happening right now" — the active Algorithm 1 step highlight, the domain-loss (`L_d`) symbol, live-updating stat emphasis, and the drag-active dropzone state. Its rarity is what makes it read as an urgent live annotation rather than decoration.

### Neutral (Light — default)
- **Paper Cream** (`#f5f0e6`): the base canvas, with a subtle ink-tinted grain texture.
- **Panel Cream** (`#faf6ec`): the opaque paper card surface every section panel sits on.
- **Sunken Cream** (`#ece4d4`): nested data-well background (chart bodies, math view, algorithm tracker body) — a slightly deeper warm tone than the panel surface.
- **Border Tan** (`#d8cdb8`): hairline dividers and card borders.
- **Ink Near-Black** (`#1c1a17`): primary text on paper.
- **Ink Dim Brown** (`#6b5f4f`): secondary text, hints, section eyebrows.

### Neutral (Dark — "Night Desk Lamp")
- **Night Background** (`#1a1512`): warm dark brown/near-black base — paper read under lamp light at night, not a cold black.
- **Night Panel** (`#241d18`), **Night Sunken** (`#14100d`), **Night Border** (`#3a2f26`): the same panel/well/border roles as light mode, inverted to the warm-dark register.
- **Night Text** (`#f0e6d6`): cream ink text, inverted from light mode.
- **Night Text Dim** (`#b3a390`): secondary text.

Both accent inks (blue-black, red pen) are held at the same or lightly brightened value across themes so they read as "the same two inks" in both modes.

### Named Rules
**The Two-Ink Rule.** Only two accent hues exist in the entire interface: blue-black ink (structural/semantic, calm) and red pen (live/active, urgent). Every other surface stays paper-neutral. This replaces the prior system's "One Loud Surface" rule — now there are two reserved inks instead of one reserved surface.

**The Symbol Legend Rule.** Each math symbol (`x`, `y`, `d`, `G_f`, `θ_f`, `h`, `G_y`, `θ_y`, `L_y`, `G_d`, `θ_d`, `L_d`, `GRL`, `λ`, `μ`, `H`, `ε`, `PAD`) owns one hue for the life of the session, re-tuned into the warm-paper family. `L_d` (domain loss) is the one symbol pinned to red pen, since it is the spec's live domain-loss quantity. Never reassign a symbol's color once introduced, and never reuse a symbol's hue for an unrelated UI element.

## Typography

**Headline/Label Font:** `ui-serif, Georgia, "Times New Roman", serif` — a journal-masthead serif used for the `<h1>` and every section eyebrow label, marking the shift from "UI chrome" to "journal heading."
**Body Font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (system stack; no custom font load — keeps the app's zero-network-dependency guarantee).
**Mono Font:** `ui-monospace, monospace` for the Algorithm 1 tracker body and numeric stat readouts (`tabular-nums`).

**Character:** A warm, hand-annotated journal voice for headings, a plain system-UI voice for body copy. Weight and size carry hierarchy alongside the serif/sans split.

### Hierarchy
- **Headline** (serif, 600, 1.5rem / 24px, tight tracking `-0.01em`): the single `<h1>`, "DANN Lab".
- **Label** (serif, 600, 0.875rem, `0.05em`–`0.1em` letter-spacing, uppercase): section eyebrows ("1 — Data", "Live Training Math", "Algorithm 1 Step").
- **Body** (sans, 400, 0.875rem, 1.5 line-height): copy, hints, stat labels.
- **Mono** (400, 0.875rem, 1.6 line-height): pseudocode tracker lines and tabular numeric stats (epoch, step, val acc), so digits don't jitter width as they update live.

### Named Rules
**The Tabular Numbers Rule.** Any value that updates during a live training run (epoch, step, loss, accuracy, lambda, mu, PAD) renders with `tabular-nums` so the presenter's eye isn't thrown by shifting digit widths mid-narration.

## Layout

A single centered column (`max-w-[1800px]`) with generous `gap-6` (24px) between sections and `px-6 pt-6` outer padding. The main content area reserves `pb-[220px]` at the bottom so the fixed transport deck never occludes content. Below `xl`, the math panel and algorithm/architecture column stack; at `xl` and above they split `4fr / 3fr`. The bottom section (losses / domain meter / feature scatter) is a 3-column grid at `lg` and up, single column below. Density is generous, not compact — this is a room-facing display meant to be read from a few feet back, not a dense admin console. Layout, grid, spacing, and corner-radius values are unchanged from the prior design system — this redesign is a material/color/type pass only.

## Elevation & Depth

Depth comes from soft, stacked-sheet drop shadows, not translucency or blur — the opposite of the prior "flat glass, depth via blur" system. Every panel is fully opaque `bg-panel` with a `shadow-paper` utility (a soft, downward-offset shadow suggesting a sheet of paper lifted slightly off the page beneath it). Nested wells (chart bodies, math view, tracker body) get a hairline ink-colored border and no shadow, to avoid double-shadow noise — only the outer panel carries elevation. The transport deck is the one surface with a directional shadow (`0 -8px 24px rgba(0,0,0,0.35)`), separating it from scrolling content as a persistent, distinct instrument-strip layer.

### Shadow Vocabulary
- **Shadow Paper** (light: `0 2px 8px rgba(28,26,23,0.12), 0 1px 2px rgba(28,26,23,0.08)`; dark: `0 2px 10px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)`): the stacked-sheet shadow on every section panel.
- **Deck Separation** (`box-shadow: 0 -8px 24px rgba(0,0,0,0.35)`): used only on the fixed bottom transport bar, to lift it off the page it floats over.
- **Active Step Glow** (`box-shadow: inset 3px 0 0 var(--accent-rose)` / `var(--accent)`): marks the currently-executing Algorithm 1 line (red pen) and the active math step (blue-black ink).

### Named Rules
**No Blur Rule.** No backdrop-blur or translucency appears anywhere in the interface. A shadow appears only to separate a genuinely floating layer (panels off the page, the transport deck) or to mark live state (the active-step ring), never as a substitute for opacity.

## Shapes

Consistently rounded, never sharp: `rounded-xl` (12px) for section-level panels, `rounded-lg` (8px) for nested data wells and buttons, `rounded-full` for every transport-deck control. Borders are hairline (1px, ink-tinted) and used to separate sunken data wells from their panel, not to frame every element. The transport deck's icon buttons are full circles at two fixed sizes (44px primary, 36px secondary) — a deliberate departure from the rectangular button language used everywhere else, marking the deck as a distinct instrument strip. Corner radii and spacing are unchanged from the prior design system.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px), 1px blue-black-ink border, cream paper fill.
- **Primary (rectangular utility buttons):** cream fill with ink text and a thin blue-black border, `px-3 py-1.5`, used for Reset/Next/Build actions outside the transport deck.
- **Hover / Focus:** background steps to a light ink wash (`surface-hover`) on hover; a 2px blue-black-ink focus ring with 2px offset on focus-visible. No transform or scale on hover — state changes read through color only.
- **Transport (icon circles):** each action gets its own hue rather than a shared neutral treatment, shifted from the prior neon set to muted ink-adjacent tones — Play muted emerald, Pause muted amber, Step/Step-epoch muted sky, Reset muted red (closest to red-pen, since a reset is a "this matters, pay attention" action) — at 44px (play/pause) or 36px (step/reset) diameter, cream-text glyph, disabled at 40% opacity.

### Chips / Stat Readouts
- **Style:** inline label + bold `tabular-nums` value, no background or border — these are read, not clicked.
- **Color:** ink (primary text color) by default, switching to red pen when the value represents a live-updating quantity in a context that needs "this just changed" emphasis.
- **State:** dash (`-`) placeholder before a value exists; real value replaces it once training starts.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px) for section panels; `rounded-lg` (8px) for nested wells.
- **Background:** opaque `bg-panel` (cream paper) for section panels; `bg-sunken` (deeper warm cream) for nested data wells (chart bodies, math view, tracker body).
- **Shadow Strategy:** `shadow-paper` stacked-sheet shadow on panels only; no shadow on nested wells (see Elevation & Depth).
- **Border:** 1px blue-black-ink-tinted `border-border-card` on panels, 1px `border-border` on nested wells.
- **Internal Padding:** 24px (panels), 12px (nested wells).

### Inputs / Fields
- **Style:** text/file inputs use `border-border`, `bg-sunken`, `rounded-md`; range sliders and checkboxes use `accent-accent` (native accent-color set to blue-black ink).
- **Focus:** 2px blue-black-ink ring, 2px offset, offset color matched to the parent surface (`panel` or the deck's own background var).
- **Dropzone:** dashed ink border at rest; solid red-pen border with a light red wash background when dragging a file over it — the one place red pen appears on user-driven interaction rather than live-training state, intentional ("this needs your attention now").

### Navigation
Not applicable — single-view application, no navigation chrome beyond the header's utility toggles (theme, hide/show controls).

### Transport Deck (signature component)
The fixed bottom player bar (`#player-bar`) is styled as a "ruler/toolbar" strip: a flat ink-dark strip (not black glass, not cream) laid over the page — the one place the strip itself stays dark-on-both-themes, consistent with its role as a distinct instrument strip rather than a paper surface. Icon transport buttons keep individually distinct hues per action, pulled from the same muted ink-family palette as the two accent inks rather than a separate neon system. Row one is always visible (transport + key live stats); a chevron expands row two (mode toggle, lambda/mu overrides, secondary stats) without moving row one. Transitions on show/hide are `transform`-based slide (`translateY(100%)`, 300ms ease) rather than fade, reinforcing the "player bar" physical metaphor. Deck-separation shadow (`0 -8px 24px rgba(0,0,0,0.35)`) lifts the strip visually off the paper page beneath it.

## Do's and Don'ts

### Do:
- **Do** keep the canvas cream paper with a subtle grain texture, and spend the two reserved inks (blue-black, red pen) only on structural/live-state highlighting.
- **Do** give every math symbol a fixed, never-reassigned hue for the session, re-tuned into the warm-paper family (see The Symbol Legend Rule).
- **Do** use `tabular-nums` on any figure that updates during a live run.
- **Do** keep panels opaque with a stacked-sheet shadow rather than translucency/blur to convey hierarchy.
- **Do** keep dark mode's two inks visually identifiable as "the same inks," not a different palette.

### Don't:
- **Don't** reintroduce blur or glass surfaces anywhere in the interface.
- **Don't** add a third accent hue anywhere outside blue-black ink and red pen.
- **Don't** change layout/grid structure, spacing scale, or corner radii — this redesign is a material/color/type pass only.
- **Don't** drop the dark mode toggle or its localStorage persistence behavior.
- **Don't** add hover scale/transform effects to buttons; state changes communicate through color and ring only.
