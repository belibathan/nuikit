# Baseline: what every component shares

*Tokens 1.6. One pattern for every component in every theme, read off the two parts the owner calls premium: the
speedometer (`systems/nuikit_hud/web/src/hud/compact.tsx`, `registry/nuikit/ui/dial.tsx`) and the minimap and vitals
(`hud/map.tsx`, `hud/key-tile.tsx`, `registry/nuikit/ui/tile.tsx`). Each rule is a lever with a good default: kit.css
holds it in `@layer nk.base` (the same in every theme), `BASELINE_TOKENS` in `packages/core/src/tokens.ts` validates
what a theme sets. A theme tunes a value, never a rule.*

## What the speedometer and the vitals get right

1. **Flat and full.** Lit segments are solid colour, unlit ones the same shape dimmed. No translucent washes.
2. **Few shapes, reused.** The keycap Tile is the gear, the compass N, the vital chip, its tag and its fill. The
   plate is the only surface. Fill is the only level.
3. **Controlled depth.** A face over its wall (a hard plate 2px below), never a soft shadow or a glow.
4. **Two voices.** Barlow italic caps for everything you scan (`MPH`, the gear, `HEALTH 100`); Geist for sentences.
5. **Compact motion on one ladder.** Digits roll, segments switch, the tag slides from behind the tile. Transform and
   opacity only, on `--nk-time-*` and `--nk-ease-*`.
6. **Alignment held.** One icon size, centred in one tile size, on one column.

The goal is a game UI language, not a web app: rows you select like a GTA menu, keys that look pressable.

## Rules (lever → default)

**Spacing: generous where you read, compact where you scan.** All on the `--nk-space-*` scale (× density).
- Surface padding `--nk-pad-surface` (space-6) on every side of a panel or dialog; header `--nk-panel-header-padding`
  (space-6 / space-6 / space-4), footer `--nk-panel-footer-padding` (space-4 / space-6 / space-6), with no rule
  above the footer (`--nk-panel-footer-rule: none`): spacing separates it.
- Rows: `--nk-row-pad-y` space-2, `--nk-row-pad-x` space-3, `--nk-row-gap` space-4 between the icon tile, the text and
  the trail; a single-line row is at least `--nk-h-row`. Rows sit space-1 apart with no hairlines between them.
- Fields and dialog buttons: `--nk-h-field` 2.75rem.

**Type: strictly two voices.**
- Titles, row titles, labels, keys, buttons, numbers: the display voice (`--nk-type-{title,label,scan,num}-*`;
  Barlow Condensed italic caps in Default, the sans at medium in Graphite). Row and notice titles use the label role
  at `--nk-row-title-size` (1rem; 1.125rem under `tile`, the condensed face reads a step larger).
- Descriptions and sentences: the body voice (`--nk-type-body-*`, Geist 400) at `--nk-row-desc-size` 0.875rem, muted.
- Never a bold sans for a row title. A notice title is sentence-led (`::first-letter` upper) whatever the script sent.

**Icons: one size in one tile.** Every row and notice icon is `--nk-icon-md` (1rem) inside a square Tile of
`--nk-row-icon-box` (2rem): the keycap face, rim and wall of the theme. A row without an icon keeps the column
(`iconSpace`), so titles start on one line.

**Selection and focus: one language.**
- `--nk-fill-style: solid` (default): the lit row (keyboard, script, the list's indicator, or the pointer on a row that
  hovers) is one flat fill in the row colour (`--nk-row-fill-color`, the brand) with dark ink; its icon tile turns into
  a dark keycap on it; the content slides in by `--nk-row-lift` (space-2) on `--nk-time-base`. The row is the mark.
- `soft`: a slanted marker (`--nk-row-marker-width`, the accent paint, the tile's skew) over a tint that fades out by
  `--nk-row-tint-reach` (0.7). Never a flat translucent slab.
- `--nk-row-indicator` stays a theme's choice: `sweep` (Default, Neon Pop) takes the above, `bar` (Graphite) keeps its
  bar plus the lift and the lit icon tile, `fill` (Signal, Velvet) its solid row.
- Focus on a field or button is a single 1px rim in `--nk-focus-rim` (the ring colour). shadcn's border plus 3px halo
  is switched off in the kit.

**Primary actions are keycaps.** `Button` and `AlertDialogAction` with the default variant draw a face (`--primary`,
the tile's slant, a top light) on a wall (the same colour in shade, `--nk-button-wall` 3px below). Hover raises the
face a pixel; a press sinks it onto the wall. The label is the scan voice. Secondary (outline) is a hairline rim on
the panel that tints on hover; ghost is bare.

**Progress is segmented or a fill, never a thick ring.** ProgressRing is the speedometer: a Dial with
`--nk-ring-segments` (24) separated by `--nk-ring-gap` (4°), on a dark disc, lit segments solid in the accent's stops
(or the tone or hue), unlit ones the track. A timed ring lights one segment at a time on the compositor. The centre
is the numeric voice with a small muted `%`; the label is the label voice. Bars are a Fill: solid, a leading edge.

**Fills are flat, full and vivid.** `--nk-fill-style: solid` (default) | `soft`. Solid covers progress, meters, the
vital liquid (`--nk-fill-opacity` 1; soft 0.42), overlay fills and selection. An icon over a solid fill stays legible:
a copy in `--nk-fill-ink` (the tile's confirm ink, dark) is clipped to the part under the surface
(`vital-chip-icon-ink`, `.hud-key-ink`).

**Surfaces: restraint.** One plate (`--nk-plate-*`): flat, a hairline, a hard drop. One hairline under a header; none
between rows or above a footer. No blur, no soft shadows, no gradients that carry colour.

**Motion: the ladder.** snap 90 (press), fast 120 (hover, a face rising), base 180 (row lift, rim), slow 280 (sheets,
dialogs, a tile landing), fill 420 (levels), pulse 1000 (alert breathe); exits at 0.7×. Things land, open, then speak:
a notice's tile lands, its plate opens, its text follows. Reduced motion keeps fades and drops every slide.

## Where it lives

| Part | Files |
|---|---|
| Levers | `packages/core/src/tokens.ts` (`BASELINE_TOKENS`, `nk-fill-style` painted as `data-nk-fill`), `packages/create-nuikit/kit.css` (`nk.base` defaults; rows, notice, ring readout in `nk.kit`; buttons and fields in the kit's `utilities` block; selection and fill style unlayered) |
| Components | `registry/nuikit/ui/menu-row.tsx` (icon Tile column, `menu-row-body/title/description`, `data-hover`, `iconSpace`), `notice.tsx`, `progress-ring.tsx`, `dial.tsx` (`segmentGap`, `paint="accent"`, `disc`, segmented track), `vital-chip.tsx` (solid liquid, ink copy) |
| Consumers | `addons/ox_lib` (context, menu, input, alert, notify, progress circle and bar), `systems/nuikit_hud` (vital keycaps) |

## Graphite under the baseline

Graphite keeps its palette, fonts, bar indicator and rounded meters. What changes there: rows are a little taller
(space-2 block padding, a 2rem icon tile column), the lit row's content slides by space-2 and its icon tile lights,
panel headers and footers use the surface padding with no footer rule, buttons use the scan voice (Inter 600), the
primary is a straight keycap (no slant: Graphite's skew is 0), fields focus with one rim, notices get a tinted icon
tile and a 2px time line, and progress rings are segmented.
