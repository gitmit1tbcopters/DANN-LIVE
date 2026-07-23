# Design: The Paper Lab Journal (DANN Lab UI Redesign)

## Overview

Full app redesign, replacing the current "Dark Lab Notebook" direction (near-black glass instrument panel) with a new creative direction: **The Paper Lab Journal**. DANN Lab reads as an annotated physical lab notebook — cream paper pages, ink typography, red-pen live annotations, blue-black structural ink.

This supersedes the design system currently documented in `DESIGN.md` (Dark Lab Notebook). `DESIGN.md` will be rewritten to describe this new system as part of implementation.

## Scope

Full application, both themes:
- Header (title, hide-controls toggle, theme toggle)
- Data upload panel (section "1 — Data")
- Main grid: Live Training Math panel, Algorithm 1 Step tracker, Architecture diagram
- Three-chart row: Losses, Domain Confusion/PAD, Feature Space
- Test panel (section "2 — Test a New Image")
- Footer
- Fixed bottom transport/control bar
- Light theme (primary/default) and dark theme ("night desk lamp")
- SVG diagram (`network-svg`) line/fill colors updated to match new ink palette

Out of scope: layout structure/grid changes, new features, content changes. This is a visual system replacement — same DOM structure and components, restyled.

## Color

### Light (default)
- **Paper base**: warm cream, `#f5f0e6`-ish, subtle grain texture applied to the canvas background
- **Ink text (primary)**: warm near-black, `#1c1a17`-ish
- **Ink text (secondary/muted)**: soft brown-grey, for labels/hints/eyebrows
- **Structural accent — Blue-Black Ink** (`#2c4a7c`-ish): section eyebrows' accent moments, static/structural highlighting, symbol legend entries that are semantic-but-not-live, focus rings, links
- **Live accent — Red Pen** (`#c0392b`-ish): reserved for "happening right now" — active Algorithm 1 step highlight, live-updating stat emphasis, domain-loss symbol, drag-active dropzone state. Kept rare, same rarity discipline as current signal-rose, so it reads as urgent annotation not decoration.

### Dark ("Night Desk Lamp")
- **Base**: warm dark brown/near-black, `#1a1512`-ish (paper read under lamp light at night — not a cold black)
- **Ink text**: cream, inverted from light mode
- Both accent hues (blue-black ink, red pen) held at the same or lightly brightened value across themes — they must stay recognizable as "the same two inks" in both modes.

### Named Rule (carried forward from prior system, restated)
**The Two-Ink Rule.** Only two accent hues exist in the entire interface: blue-black ink (structural/semantic, calm) and red pen (live/active, urgent). Every other surface stays paper-neutral. This replaces the old "One Loud Surface" rule — now there are two reserved inks instead of one reserved surface.

## Typography

- **Headers** (h1, section eyebrows currently uppercase-tracked labels): switch to serif, `ui-serif`/Georgia system stack — journal masthead feel
- **Body text**: unchanged sans system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- **Mono/numeric**: unchanged mono stack (`ui-monospace, monospace`), `tabular-nums` rule stays in force for any value that updates live during a training run (epoch, step, loss, accuracy, lambda, mu)

Section eyebrow labels keep their current weight/tracking treatment but render in serif instead of sans, to mark the shift from "UI chrome" to "journal heading" without changing the information hierarchy.

## Surface & Texture

- **Panels** (setup, math, algo tracker, architecture, chart cards, test panel): cream paper card surface, faint paper grain texture, subtle stacked-sheet drop shadow (soft, offset downward, not the current glass/blur treatment)
- **No backdrop-blur anywhere.** Depth comes from shadow/stacking, not translucency — this is the direct opposite of the prior system's "flat glass, depth via blur" rule.
- **Nested wells** (chart bodies, math view, tracker body, sunken data areas): slightly deeper warm-grey/cream tone than the panel surface, hairline ink-colored rule border, no shadow (only the outer panel gets the stacked-sheet shadow, to avoid double-shadow noise)
- **Corner radii, spacing scale**: unchanged from current system (rounded-xl panels, rounded-lg wells, existing 12/16/24px spacing rhythm) — this redesign changes color/material/type, not geometry

## Components

### Buttons
- Rectangular, thin ink-colored (blue-black) border, cream fill
- Hover: light ink wash (subtle tint shift, no scale/transform — this rule carries forward unchanged)
- Focus: 2px blue-black ink focus ring, 2px offset

### Transport Deck (bottom bar)
- Stays fixed, full-width, always-visible per existing behavior
- Restyled as a "ruler/toolbar" strip: flat ink-dark strip (not black glass), not cream — this is the one place the strip itself goes dark-on-both-themes, consistent with its role as a distinct instrument strip laid over the page
- Icon transport buttons (play/pause/step/reset) keep individually distinct hues per action, but the hue set shifts from the current neon (emerald/amber/sky/rose) to muted ink-adjacent tones that read as pulled from the same palette family as the two accent inks, not a separate neon system
- Deck-separation shadow (lifts the strip visually off the page) is kept, restyled to suit the paper surface below it

### Chips / Stat Readouts
- Unchanged pattern: inline label + bold tabular-nums value, no background/border
- Color: ink (primary text color), switching to red pen only when representing a live-updating value in a context that needs "this just changed" emphasis (existing behavior/pattern, just recolored)

### Cards / Containers
- Panels: cream paper, grain, stacked-sheet shadow, 1px hairline blue-black-tinted border
- Nested wells: deeper warm tone, hairline border, no shadow

### Inputs / Fields
- Text/file inputs: hairline ink border, paper-well background, rounded-md
- Range sliders/checkboxes: native accent-color set to blue-black ink
- Dropzone: dashed ink border at rest; solid red-pen border + light red wash background on drag-active (this is the one place red pen appears on user-driven interaction rather than live-training state, intentional — "this needs your attention now")

### Active-State Highlighting
- Algorithm 1 active step ring/highlight: red pen (was signal-rose)
- Math symbol legend: `G_y`/label-predictor branch and other structural symbols get blue-black ink; domain-loss (`L_d`) symbol and anything tied to "current live step" gets red pen — same assignment logic as before, new hues

## Do's and Don'ts

### Do
- Keep grain/texture subtle — legibility of dense math/mono content is the priority, texture is atmosphere not noise
- Keep the two-ink discipline: nothing outside blue-black/red-pen gets accent treatment
- Keep tabular-nums on all live-updating figures
- Keep dark mode's two inks visually identifiable as "the same inks," not a different palette

### Don't
- Don't reintroduce blur/glass surfaces
- Don't add a third accent hue anywhere
- Don't change layout/grid structure, spacing scale, or corner radii — this is a material/color/type pass only
- Don't drop the dark mode toggle or its localStorage persistence behavior

## Implementation Notes

- `DESIGN.md` front-matter (colors, typography, components) and body both need full rewrite to reflect this system — it's currently the source of truth for the old direction and will actively mislead if left as-is
- `src/ui/layout.css` and Tailwind utility classes throughout `index.html` and JS-generated templates (controls, player bar, viz components) need their color tokens swapped — this is a broad find/replace across the CSS custom properties layer plus any hardcoded hex values in JS template strings
- SVG network diagram colors are likely set in JS (`src/viz/` or wherever `network-svg` is populated) — needs a pass to match new ink palette
