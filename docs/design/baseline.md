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

**Selection and focus: one language.** See [Selection](#selection) below: the lit row sits on the keycap Tile, focus
is the hover state, one tile slides per list, rows never touch.

**Primary actions are keycaps.** `Button` and `AlertDialogAction` with the default variant draw the Tile: a face
(`--nk-tile-key`, the tile's slant, `--nk-tile-radius`, a top light) on a wall (the same colour in shade,
`--nk-tile-wall-shade`, dropped `--nk-tile-wall` straight down). Hover and focus raise the face a pixel; a press sinks it
onto the wall. The label is the scan voice. Secondary (outline) is a hairline rim on the panel that tints on hover and
focus; ghost and secondary take the accent on hover and focus alike.

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

## Selection

*Tokens 1.7 (`SELECTION_TOKENS`). Settled after the owner's three observations: a focus ring around Resume that hid
under its shadow; Resume a slanted keycap with a wall while a hovered row was a flat, rounded, unslanted fill; and a
hover band touching the row above. One convention, every theme, every list.*

1. **No focus rings, anywhere.** Keyboard, controller and programmatic focus render the same lit state as the pointer's
   hover: one language (`data-lit` on a list's item, `:hover` / `:focus-visible` on anything else). kit.css drops every
   outline and ring on `:focus-visible` (shadcn's 3px halo included). Focus still moves and the lit state shows where.
   The one exception is a text field holding the caret: it keeps a single 1px rim in `--nk-focus-rim`, because typing
   must show where the text goes; checkboxes and switches light that rim too (they have no hover look of their own).
   Buttons: the primary's face rises a pixel, outline tints, ghost and secondary take the accent, link underlines.
2. **The selection IS a Tile.** A lit row, menu item or tab is the primary keycap: the face in the theme's skew over the
   wall dropped straight below, the same radius (`--nk-tile-radius`, `--nk-r-control`), the same top light and depth
   line. Under `--nk-fill-style: solid` the face is `--nk-tile-key` (the primary) with `--nk-tile-key-ink`; under `soft`
   it is a tinted face (`--nk-tile-tint` of the primary, the wall half that) with the foreground ink. A destructive row's
   tile takes `--destructive`. Resume at rest and a lit row are the same object in two states.
3. **One indicator per list, sliding.** Each list (MenuRowList, pause menus, ox_lib context and list menus, the
   inventory item menu, tabs) has a single `SelectionTile` (`registry/nuikit/ui/selection-tile.tsx`, kit class
   `nk-indicator`) that moves between items by transform: `translate()`, and a size change by a measured FLIP (the new
   box at once, drawn scaled from the old one, settling to scale 1), never a height or width animation. It glides on
   `--nk-indicator-time` / `--nk-indicator-ease` (the ladder); a key held down glides fast then jumps
   (`data-repeat`); reduced motion and motion off jump. The items change ink at once: no per-row fades, no row fills.
   Last input wins: a pointer move lights the row under it, a key press hands it back to focus or the UI's `active`.
4. **Rows never touch.** A list (`nk-list`) spaces its items by `--nk-list-gap` (the wall plus `--nk-space-1`) and
   leaves `--nk-tile-wall` under the last one; the tile sits `--nk-tile-inset` in from the item's sides (room for the
   skew). The lit row's lead and text slide by `--nk-row-lift`; its trail (meta, keys, checkbox, stepper) holds its
   column.

| Lever (1.7) | Default | What it sets |
|---|---|---|
| `--nk-tile-wall` | 0.1875rem | How far the face sits above its wall (`--nk-button-wall` reads it) |
| `--nk-tile-wall-shade` | 0.45 | How dark the wall is (the scrim over the face colour) |
| `--nk-tile-radius` | `--nk-r-control` | The keycap's radius: the primary button and the selection tile |
| `--nk-tile-key` / `--nk-tile-key-ink` | `--primary` / `--primary-foreground` | The solid face and its ink |
| `--nk-tile-tint` | 0.16 | The soft face's opacity |
| `--nk-tile-inset` | 0.375rem | The tile's inset from its item's sides (the primary button's face too) |
| `--nk-list-gap` | wall + space-1 | Between the items of a list |

Use it: `<MenuRowList active={i}>` for rows; `<SelectionTile items="[data-slot=tabs-trigger]" lit="[data-state=active]"
pointer={false} focus={false} />` as the first child of a `TabsList`; `lit="[data-highlighted]"` in a Radix menu's
content; `useSelectionIndicator(ref, options)` for a list that renders its own `nk-indicator`. A row or a tab outside a
list draws the same tile itself (its `::before` wall and `::after` face), without the slide. `--nk-row-indicator`
(bar, fill, outline, sweep) and `--nk-row-marker-width` / `--nk-row-tint-reach` no longer change how rows select.

## Where it lives

| Part | Files |
|---|---|
| Levers | `packages/core/src/tokens.ts` (`BASELINE_TOKENS`, `SELECTION_TOKENS`, `nk-fill-style` painted as `data-nk-fill`), `packages/create-nuikit/kit.css` (`nk.base` defaults; rows, notice, ring readout in `nk.kit`; the `nk-row`, `nk-list` and `nk-indicator` utilities; buttons and fields in the kit's `utilities` block; the Selection section and fill style unlayered) |
| Components | `registry/nuikit/ui/selection-tile.tsx` (`SelectionTile`, `useSelectionIndicator`), `menu-row.tsx` (icon Tile column, `menu-row-body/title/description`, `data-hover`, `data-tone`, `iconSpace`; `MenuRowList`), `notice.tsx`, `progress-ring.tsx`, `dial.tsx` (`segmentGap`, `paint="accent"`, `disc`, segmented track), `vital-chip.tsx` (solid liquid, ink copy) |
| Consumers | `systems/nuikit_pause` (home rows under Resume, sub-page lists, settings tabs), `addons/ox_lib` (context, list menu, input, alert, notify, progress circle and bar), `addons/ox_inventory` (the item menu), `systems/nuikit_hud` (vital keycaps) |

## Graphite under the baseline

Graphite keeps its palette, fonts and rounded meters. What changes there: rows are a little taller
(space-2 block padding, a 2rem icon tile column), the lit row sits on the straight Tile (skew 0) like every theme's
and its content slides by space-2,
panel headers and footers use the surface padding with no footer rule, buttons use the scan voice (Inter 600), the
primary is a straight keycap (no slant: Graphite's skew is 0), fields focus with one rim, notices get a tinted icon
tile and a 2px time line, and progress rings are segmented.
