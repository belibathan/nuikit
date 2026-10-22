# Ink: the design system contract

*Ink is nuikit's flagship theme: monochrome, Barlow Condensed italic caps for anything you scan, Geist for sentences, one slanted keycap language, fill-based status, transform and opacity motion. This page turns it into kit levers (`--nk-*`, so every theme gets them), the primitives every surface must use, the lint rules that hold the line, and the migration. Sources: the four audits in `.local/audit/` (hud, menus, interactions, foundation). File refs are `path:line` as of the audit; C = `systems/nuikit/theme/ink.css`, K = `packages/create-nuikit/kit.css`, I = `systems/nuikit/theme.css`.*

## 1. Principles

1. **One tile language.** Keys, notice icons, tab marks, checked boxes, vital chips, gears and telltales are one Tile: a face slanted -12deg (the box stays upright), a 1px rim, on a solid plate 2px down and right.
2. **Hard drops only.** Shadows have no blur. Depth is an offset plate, never a soft glow or a filter.
3. **Fill, not rings.** Status reads as a level filling left to right, or a face turning white. Rims switch state; they never tween, and there are no glow rings.
4. **No pills, no blur.** Radius comes from four steps (key .25, chip .375, control .5, surface .75rem). No `rounded-full`, no `backdrop-filter`: FiveM draws it as a black box.
5. **Colour means something.** Black, white and four greys. Success, warning, danger, gold and role hues appear only when they carry information. No colour gradients, no purple.
6. **Two voices.** Barlow italic caps (with 0.15em overhang pad) for display, titles, labels, keys and numbers. Geist for sentences.
7. **Transform and opacity only,** on one ladder (snap 90, fast 120, base 180, slow 280, fill 420, pulse 1000ms). Things land, open, then speak. Exits are 0.7x and retract.
8. **Themes set values, not rules.** Every Ink decision is a `--nk-*` value on a kit lever. A theme that needs a selector has found a missing lever.

## 2. Levers: the token contract (tokens 1.5)

Add these to `packages/core/src/tokens.ts` as new groups (`SCALE_TOKENS`, `TYPE_ROLE_TOKENS`, `TILE_TOKENS`, `PLATE_TOKENS`, `FILL_TOKENS`) and bump `TOKENS_REVISION` to `"1.5"`. kit.css consumes them, and Graphite keeps today's look through derived defaults. A new treatment preset, `--nk-treatment: tile`, fills the Ink values, so Ink is `tile` plus a palette. *Alias* means the old name stays for one revision and reads the new one; *replace* means it is deleted.

**Spacing.** `--nk-space-unit` (= `.25rem × --nk-density`; aliases today's `--nk-space`, K:30) and `--nk-space-{1,2,3,4,6,8}` = n × unit. Semantics: `--nk-gap-cluster` (space-2: icon + text, key + label), `--nk-gap-items` (space-1: items in a bar), `--nk-pad-x` (space-3: inline pad of anything labelled), `--nk-pad-surface` (space-6). Replaces `--ink-1..6`, `--ink-gap-*` and `--ink-pad-x` (C:12-20). Ink sets density 1.

**Radius.** `--nk-r-key` .25, `--nk-r-chip` .375, `--nk-r-control` .5, `--nk-r-surface` .75rem, with defaults derived from `--radius` as K:77-100 does now. Aliases: `--nk-key-radius` → r-key; `--nk-chip-radius` → r-chip; `--nk-row-radius` → r-control; `--nk-meter-radius` → r-key; `--nk-material-*-radius` → r-surface. Replaces `--ink-r-*` (C:26-29) and the duplicate literals in I. There is no pill value.

**Heights.** `--nk-h-key` 1.5, `--nk-h-chip` 1.75, `--nk-h-control` 2.25 (buttons, fields, bar items), `--nk-h-row` 3rem (list rows; aliases `--nk-row-height`). Replaces `--ink-h-*` and `min-h-11/12` / `h-10/12`.

**Icons.** `--nk-icon-sm` .75, `--nk-icon-md` 1 (default next to text), `--nk-icon-lg` 1.25rem, `--nk-icon-stroke` 2. A muted icon uses `--muted-foreground`, never an opacity literal.

**Type roles.** Five roles: `scan` (keys, buttons, tabs), `title`, `label`, `num`, `body`. Each has six tokens, `--nk-type-<role>-{family,style,weight,tracking,case,pad}`. Size comes from `--nk-text-<role>`, which extends K:27-45 (`label/title/section/display`) with `key` and `body`. Kit classes `.nk-scan`, `.nk-title`, `.nk-label`, `.nk-num` and `.nk-body` apply a role; nothing else sets font properties.

| role | family | style | weight | tracking | case | pad | Ink size |
|---|---|---|---|---|---|---|---|
| scan | `--font-display` | italic | 800 | .02em | upper | .15em | `--nk-text-key` .8125rem |
| title | `--font-display` | italic | 800 | .02em | upper | .15em | `--nk-text-title` |
| label | `--font-display` | italic | 700 | .03em | upper | .15em | `--nk-text-label` |
| num | `--font-display` | italic | 700 | .01em, tabular | none | .15em | inherits |
| body | `--font-sans` | normal | 400 / 500 | 0 | none | 0 | `--nk-text-body` |

The role defaults alias `--nk-weight-display/strong`, `--nk-tracking-display/label`, `--nk-label-case`, `--nk-heading-case` and `--nk-display-style`. They replace `--ink-scan` and its hand-written copies (C:272, 380, 427, 528). **Open:** ink-fonts.css inlines only Barlow 600 italic, so 700 and 800 are synthesised. Either ship 800 italic, or set the scan weights to 600.

**Tile.** `--nk-tile-face` (#161616), `--nk-tile-light` (top hairline, white .16), `--nk-tile-rim` (white .32), `--nk-tile-rim-focus` (white .4), `--nk-tile-plate` (#737373), `--nk-tile-plate-dim` (#262626, HUD), `--nk-tile-plate-x` / `-y` (2px), `--nk-tile-press` (1px), `--nk-tile-skew` (-12deg), `--nk-tile-confirm-face` (`--foreground`), `--nk-tile-confirm-ink` (`--background`). Replaces `--ink-face`, `--ink-edge`, `--ink-drop(-dim)`, `--ink-skew`, `--nk-skew` and the `data-nk-skew` family (K:1078-1210), plus the literals `2px`×9 and `.4`×6 (C:143-473). Aliases: `--nk-slab-key-*` and `--nk-key-*`.

**Plate (surface recipe).** `--nk-plate-rgb` (a triplet, 10 10 10), `--nk-plate-bg` = `rgba(var(--nk-plate-rgb), var(--nk-material-<ctx>-opacity))` (no color-mix on Chromium 103), `--nk-plate-hair` (white .12), `--nk-plate-drop` (`0 .125rem 0 rgb(0 0 0/.6)`, hard), `--nk-plate-radius` (r-surface). Replaces `--ink-plate` (C:33, which ignored material opacity), `--ink-hair`, the soft `0 2px 6px` recipe (C:218, 224, 509) and the panel recipe copied into 8 app.css files.

**Fill.** `--level` (0–1, set inline), `--nk-fill-color` (`--foreground`), `--nk-fill-track` (white .12), `--nk-fill-tint` (white .12, the row sweep), `--nk-fill-edge` (a leading 1px at white .4), `--nk-fill-alert` (`--destructive`). The existing `--nk-level-style`, `--nk-alert-threshold` and `--nk-fuel-threshold` stay the only style and threshold levers. Replaces `--ink-sweep` and `--ink-sheen` (fills are flat now) and the white wash over meters (C:450-454).

**Motion.** The ladder is `--nk-time-{snap,fast,base,slow,fill}`, derived from `--nk-duration` d as .5 / .667 / 1 / 1.556 / 2.333 × d (Ink d = 180 gives 90/120/180/280/420), plus `--nk-time-pulse` fixed at 1000ms. The rest of the motion contract:
- `--nk-exit-factor` .7, and `--nk-time-exit` = base × factor.
- `--nk-stagger` 40ms, consumed through `--i`.
- `--nk-time-reduced` 100ms: one reduced-motion value, replacing `REDUCED_FADE_MS` and Ink's 120 (C:642-661).
- Distances: `--nk-lift` .5rem (row slide, slot lift), `--nk-rise` .5rem (enter), `--nk-land-scale` .6.
- `--nk-confirm-scale` (Ink 1.08) and `--nk-deny-x` (.3125rem, two beats of `fast`).

Eases stay `--nk-ease-{standard,expand,retract,spring,breathe}`. Aliases: press → snap, hover → fast, move/modal/confirm/retract/screen → slow, ambient → fill. Replaces `--ink-t-*`, `--ink-stagger`, `--ink-standard..breathe` (C:43-54) and the literal `--ink-t-exit: 154ms`.

**Hygiene.** Move the phantom tokens into the contract: `nk-chip-shape`, `nk-label-attach` and `nk-vital-{icon,display,neighbours}` (vital-chip.tsx:83-88). Sheet, Dialog and Toast start consuming `nk-z-*`. Delete `nk-hang-*`. `--nk-row-indicator` gains the value `sweep`, so the row sweep becomes kit behaviour. Delete `--vital-*` (I:55-59); `--role-*` is the source.

## 3. Primitives

Every surface composes these primitives and does not restyle them locally. Components live in `registry/nuikit/ui/` (new: `tile`, `action-bar`, `icon-text`, `fill`, `dialog-shell`, `sheet-section`, `dial`); their CSS lives in kit.css, so a theme only sets values. Shared attributes: `data-state` = `rest | focus | hold | confirm | alert | disabled`; `data-active` = on, selected or checked; `data-tone` = `neutral | info | success | warning | danger`; `data-hue` = a role; `--level` = 0–1.

**Tile / Keycap** (`tile.tsx`; `Kbd` renders `Tile` with `data-slot="kbd"`).
- *Anatomy, back to front:* the root (an upright span for layout); `::before`, the plate, offset by `--nk-tile-plate-x/y`; `tile-face`, the skewed layer carrying rim and light; the content (a scan-role legend, an `--nk-icon-md` icon, or a glyph); `tile-fill`, `scaleX(var(--level))` for hold; `tile-tag`, the plate extending right with a label. The tag opens with a clip reveal +80ms after the tile lands.
- *Props:* `size` sm|md|lg (= h-key / h-chip / h-control), `shape` key|square, `state`, `active`, `level`, `tone`, `hue`, `tag`, `tagOpen`.
- *States:* focus switches the rim to rim-focus. Hold presses by `--nk-tile-press` and fills. Confirm turns the face white and pops by the confirm scale over `slow` with the spring ease. Alert sets a danger rim and breathes (opacity). Disabled is 50% opacity.
- *Data attributes:* `data-slot=tile|kbd`, `data-size`, `data-shape`, `data-tag`.
- *Replaces:* Ink's 5-slot keycap list (C:101-182), notice-icon (C:238-270), the tab mark (C:397), the checkbox key, the vital-chip drop plate (C:462-481) and the kit `data-nk-skew` family. On the HUD: KeyTile (hud.css:2194-2345), `.hud-gear` (2124-2150) and `.hud-c-tell` (2169-2190). Elsewhere: `.inv-key` (ox_inventory app.css:119-134), the ox_lib toast tile (app.css:325-339) and the death hint key (App.tsx:173).

**Fill / Level** (`fill.tsx` and the `.nk-fill` class). Anatomy: a track (`--nk-fill-track`), a bar (`scaleX(--level)` from the left, in `--nk-fill-color` or the hue) and an edge (`--nk-fill-edge`). It takes `style` (`--nk-level-style`: bar|ring|liquid|slab|pips), `tone`, `hue` and `level`. A level change eases over `--nk-time-fill`. When `level ≤ --nk-alert-threshold`, one helper, `alertAt()`, sets `data-state="alert"`. It replaces four implementations: the key-prompt hold (C:190 + K:1405), the row sweep (C:289-311), the meter wash (C:450-458) and the KeyTile liquid.

**Chip / Badge** (`data-slot="badge"`, with `.nk-chip` as an alias). Height h-chip, radius r-chip, padding-x space-2, gap cluster, icon md, label role, centred on one line. It takes `tone`, `hue`, `fill` hair|tint|solid, `icon` and `count`; `variant="dot"` is a square of space-2 with radius r-key. It replaces three chip systems on the HUD (`.hud-tag` 284, `.hud-air-flag` 1046, `.hud-map-tag` 1143, `.hud-chip` 119, the telltale strip 695-731, and HudChip's pill and tile shapes). In menus it replaces `.inv-count`, `.inv-price`, `.pause-blip-count` (pause.css:122-165) and the drag bubble (overlays.tsx:37). It also replaces seven `rounded-full` status dots and chat's `.nk-presence` and `.nk-tag`.

**IconText** (`icon-text.tsx`, `data-slot="icon-text"`). A flex row on one centre line: gap cluster, icon md, and a text role of label|num|body; `size` sm|md|lg maps to the type steps. It replaces HUD money (461), job (510), fuel (658) and ammo (1300), the inventory notes (overlays.tsx:123) and the flag and tag icon rows. Today these use nine icon sizes and eight gaps.

**ActionBar (+Item, Label, Sep)** (`action-bar.tsx`, on the existing `action-bar`, `-item`, `-label` and `-sep` slots). Anatomy: an optional plate, then items separated by gap-items. Each item holds keys (Tile sm) or an icon, plus a label, and is a `<button>` when it acts. Props: `keys[]`, `icon`, `label`, `onClick`, `level` (hold), `state`, `plate`. It is the only hint, close and back pattern. In menus it replaces pause home.tsx:57-79, the Back button's inline Kbd (sheet.tsx:88-92, map.tsx:244) and `.inv-hint` (controls.tsx:108-121). In the addons it replaces `.ox-hints` (list-menu.tsx:277), `.ia-hint` (illenium App.tsx:126), HudChip+Kbd (Banking App.tsx:133), the idcard hint (App.tsx:119) and the ghost Button+Kbd footers (doorlock :261, taxi :157, vehiclesales :275).

**Row** (MenuRow only, `.nk-row`). Anatomy, left to right: the sweep (`::before`, a Fill at level 1 with the tint), an optional indicator, a lead (icon or image), a body (a label-role title over a body-role description), and a trail (meta, Kbd, value stepper, chevron, or a check drawn as a Tile with `active`). Height is h-row. Focus slides the content by `--nk-lift` over `base` with the standard ease. New props are `as="div"` and a `kbd` trail; it keeps `tone`, `meta`, `description`, `checked`, `active` and `alert`. `data-state` is focus|alert|disabled. It replaces the hand-built rows: in menus home.tsx:174, keys.tsx:33, controls.tsx:95 and the item-menu items (app.css:481-485); in the addons scoreboard App.tsx:95, Banking transactions.tsx:47, mm_radio screens.tsx:89-231 and the `dl` rows in taxi :138 and vehiclesales :72. It also removes the separate row slides in ox_lib app.css:272 and pause.css:302.

**Sheet** (EdgeSheet).
- *Anatomy:* a scrim (`--scrim`, with no gradient literal; edge-sheet.tsx:127); a panel (the plate recipe in the menu context); a header, holding either a back slot (an ActionBarItem with Esc) or an icon, plus title, description and actions; an optional 2px edge Meter; the body (ScrollArea > `SheetSection`, which is a label, meta and rows); and a footer that is an ActionBar.
- *Props:* `side`, `variant` floating|flush, `anchor` full|upper, `width`, `back`/`onBack`, `page` (a keyed page change), `meter`, `layer` (`--nk-z-surface`).
- *Motion:* one rule. Enter takes `slow` with the expand ease; exit takes `exit` with the retract ease.
- *Replaces:* the PauseSheet chrome (sheet.tsx:31-100), the anchors `top-[28|30|34vh]`, and six copies of `min(calc(var(--nk-time)*2.2),360ms)` (pause.css:41, ox_inventory app.css:277, ox_target :133, mm_radio :30, illenium :74, ox_lib ~232).

**Dialog shell** (`dialog-shell.tsx` over `dialog-content` and `alert-dialog-content`). Anatomy: a plate; a header (title role, a body-role description, a hairline); a body padded by `--nk-pad-surface`; a footer of Buttons or an ActionBar. The primary button is a Tile-style white face on a hard drop. Props: `size` sm|md|lg and `position` center|top. A centred dialog animates opacity only; a top dialog may also rise by `--nk-rise`. It sits on `--nk-z-dialog`. It replaces ox_lib's `DIALOG_PANEL rounded-xl` (input-dialog.tsx:72) and alert-dialog.tsx:93-109 with app.css:243-300, illenium App.tsx:206-210, Banking money-dialog.tsx, pause App.tsx:193-199, and the inventory's controls.tsx:85, whose `[data-slot=dialog-content]` rule leaks to every dialog (app.css:490-496).

**Toast / Notice** (`notice.tsx`). Anatomy: a plate; a square Tile (tone = status; alert on danger); a title-role title; a body-role description; and a duration Fill. Order: the tile lands (land-scale, spring), the plate reveals +80ms, the text follows +120ms. On exit the text fades first, then the plate. `status` is renamed `tone`, with `error` kept as an alias of `danger`. Lifetime comes from `--nk-notify-ms-*`, and the stack sits on `--nk-z-system`. It replaces ox_lib app.css:297-345, Banking App.tsx:49 and 150-156, chat `.nk-note`, and the ox_lib notify in stress client.lua:14.

**Meter** (`meter.tsx`). Anatomy: label and value (an IconText in the num role), a track holding a Fill, and an optional cancel key (Tile sm). Colour comes from `data-hue` on the meter or its nearest ancestor, then `tone`, then white. There is one threshold (alert, or fuel), and alert is spelled `data-state="alert"`. `variant` is bar|edge|outline|segments; the track is .25rem for a bar and .125rem for an edge. It replaces `.inv-meter` (app.css:360), EdgeSheetEdge (edge-sheet.tsx:191), SlotOutline (outline.tsx), the HUD fuel (658, 1532), RPM (880, 1625) and segment (929) bars, three separate thresholds (inventory-panel.tsx:99, slot-tile.tsx:112, item-image.tsx:34), and `data-low`/`data-redline`/`data-critical`. Countdown, Band and ProgressRing read hue the same way.

**Empty state** (`empty-state.tsx`, `data-slot="empty-state"`). Anatomy: a square Tile at rest with an icon, a title-role title, a body-role description, and an optional action (an ActionBarItem or a Button). `size` is panel|inline. It replaces the bare `<p>` messages in pause (map.tsx:269, settings.tsx:79, keys.tsx:27, home.tsx:181) and the inventory caption copy (inventory-panel.tsx:42-49). In the addons it replaces Banking App.tsx:320, illenium ped.tsx:87 and tattoos.tsx:77, and mm_radio screens.tsx:89 and 224.

**Dial / Speedometer** (`dial.tsx`; `speedometer.tsx` composes it). Anatomy: one SVG geometry with a track arc, a value arc (data-driven, with no CSS tween on the dash), ticks and a needle (a rotate transform). Inside sit a num-role readout, a gear Tile and a unit label. Props: `size` sm|md|lg, `style` digital|ticks, `value`/`max`, `redline` (alert above it) and `segments`. Colours come only from `--hud-*` and the fill tokens. It replaces `.hud-arc*` (751-846), `.hud-c-gauge/arc/ticks` (1344-1420), the rose (995), the map ring (1094-1135) and the `#fff` literals (2376-2380).

## 4. Conventions

`nuikit check` (`packages/cli/src/check.ts`) gains these rules next to `color/*`. Each starts as a warning and becomes an error per directory once that directory's wave lands. An exception needs `nuikit-ignore <rule>` with a reason (for example, the radial's px type).

| rule | flags | use instead |
|---|---|---|
| `radius/raw` | `border-radius` literals, `rounded-{sm..2xl}`, `rounded-[…]`, `calc(var(--radius) ± n)` | `--nk-r-*`, `rounded-(--nk-r-*)` |
| `radius/pill` | `rounded-full`, `9999px`, `50%` on anything but avatars | r-chip, Chip `dot` |
| `effect/blur` | `backdrop-filter`, `backdrop-blur-*`, `filter:` (blur/drop-shadow/grayscale), `drop-shadow-*` | the plate recipe, opacity |
| `color/mix` | `color-mix()` anywhere (Chromium 103 lacks it) | rgba(var(--…-rgb), a) tokens |
| `shadow/soft` | a box-shadow with blur > 0, `shadow-{sm..2xl}` | `--nk-plate-drop`, the tile plate |
| `motion/duration` | ms/s literals in transition, animation, `duration-*` or `animationDelay` | `--nk-time-*`, `calc(var(--nk-stagger) * var(--i))` |
| `motion/ease` | cubic-bezier literals, `ease`/`ease-in`/`ease-out` keywords | `--nk-ease-*` |
| `motion/property` | a transition on anything but transform/opacity | switch rims; move with transform |
| `type/raw` | font-size or font-weight literals, `text-[…]`, `text-{xs..5xl}`, `font-{medium,semibold}`, `font-mono` on keys | `.nk-{scan,title,label,num,body}`, `--nk-text-*` |
| `selector/class-substring` | `[class*=…]`, `[class^=…]`, `[class$=…]` | `data-state`, `data-tone`, `data-hue` |
| `state/alert` | `data-critical`, `data-low`, `data-redline`, `data-danger`, `data-ink-deny` | `data-state="alert"`, `data-nk-deny` |
| `theme/unlayered` | theme CSS outside a layer, `!important`, doubled-class specificity, app markup (`.inv-*`, `.pause-*`) | `@layer nk.theme` + tokens |
| `space/off-scale` (warn) | gaps or padding off the .25rem step (.375, .3125, gap-1.5…) | `--nk-space-*`, `gap-(--nk-gap-*)` |

- **One alert spelling.** `data-state="alert"` covers critical, low, redline and danger. Deny is a transient `data-nk-deny`, not a state.
- **Tone and hue, unified.** `tone` is meaning (neutral|info|success|warning|danger) and maps to `data-tone`. `hue` is a role from `ROLE_SETS` (health, armor, police, legendary…) and maps to `data-hue`. Every coloured primitive takes both: hue sets the colour and tone drives alert. One `toneVars()` replaces the separate tone maps in Meter, Countdown, Band and Notice. `destructive` and `error` stay accepted aliases of `danger` for one revision.
- **No unlayered theme overrides of kit internals.** The kit ships `@layer nk.base, nk.kit, nk.theme, nk.app`. A theme writes only into `nk.theme`, with token values and rules on documented data attributes. It never resets kit internals (no `background:none` or `clip-path:none` on kbd, as C:101-130 does today).
- **Synced copies.** `index.css` is generated by `pnpm sync` and CI diffs all 12 copies. Two versions exist today (interactions audit, note at top).

## 5. Migration plan

Lanes own disjoint directories, so they don't collide:
- Before W1 merges, only the lead edits `packages/`, `registry/` and `systems/nuikit/`.
- In W1, only the theme lane edits `systems/nuikit/theme*`.
- W2 lanes never edit kit, registry or theme. A missing lever goes to the lead as a request.
- The lead regenerates the synced `index.css` and `components/ui/*` copies once with `pnpm sync` at the start of W2. They are never hand-edited.

**W0: core and kit (lead).** Merges first.
1. tokens.ts: the five groups, the `tile` treatment preset, the aliases and the phantom tokens; delete `nk-hang-*`; set revision 1.5.
2. kit.css: the layer order; consume the spacing, radius, height and type-role tokens; one reduced-motion block (`--nk-time-reduced`); a `--i` stagger.
3. kit.css primitives: tile (absorbs K:1078-1210), fill (absorbs K:1347-1425), chip, icon-text, action-bar, the row sweep (`--nk-row-indicator: sweep`) and the plate recipe.
4. Registry, new: tile, action-bar, icon-text, fill, dialog-shell, sheet-section and dial.
5. Registry, changed: `Kbd` renders Tile; edge-sheet gets back, anchor, flush, one motion and `--scrim`; menu-row gets `as` and a kbd trail; notice gets tone and Tile; meter, countdown, band and progress-ring take hue via `toneVars`; empty-state uses Tile.
6. check.ts: the §4 rules at warn level, with tests in `packages/cli/test/check.test.ts`, plus the CI diff of the index.css copies.
7. docs/tokens.md and docs/design/contract.md list the new groups.

Exit criteria: tests are green, `nuikit check registry` is clean at error level, and Graphite screenshots are unchanged.

*W0 status (Oct 22):* landed: steps 1–3, 6 and 7, and of 4–5 `tile` (with `Kbd`), `fill` (with `alertAt()` and
`toneVars()`), `chip`, `icon-text`, `action-bar`, Meter `hue` / `threshold` (and `data-state="alert"`), EdgeSheet
`back` / `anchor="upper"`, EmptyState `tile`. Calls made: the old component tokens read the new ones
(`--nk-key-radius: var(--nk-r-key)`, `--nk-key-bg: var(--nk-tile-face)`), so a theme may set either for one revision;
`--nk-meter-radius` is not aliased (Graphite's meters stay rounded); the 1.2 rungs alias the ladder only under `tile`
(Graphite keeps its timings); Badge keeps shadcn's look (W2 swaps badges for Chip); role extras (a label's case and
tracking, the overhang pad) and the notice tile apply under `[data-nk-treatment="tile"]`, since Graphite's classes
never set them. Not yet: `dialog-shell`, `sheet-section`, `dial`, MenuRow `as` / kbd trail, Notice `tone`,
`toneVars` in Countdown / Band / ProgressRing, and the CI diff of the index.css copies. Graphite screenshots: not
compared (no baseline run); the defaults are equal by construction.

**W1: Ink as values (theme lane).** Starts after W0 merges.
1. I sets `--nk-treatment: tile` and drops `--nk-skew: 0deg` (I:123) and `--vital-*`.
2. C's `:root` holds `--nk-*` values only. `--ink-*` becomes aliases for one release, removed after W2.
3. Delete C's re-implementations: the keycap lists (101-182), the notice tile (238-279), the row sweep (281-345), the hold (190), `ink-pop`, the reduced-motion block (642-661) and the nth-child stagger (492).
4. Delete C's hacks: `[class*=ring-*]` (181), `[class*=text-destructive]` (314), `!important` (578, 654), `.inv-tray.inv-tray`, and every app-markup selector.
5. Move what remains into `@layer nk.theme`, targeting ink.css ≤ 150 lines (from 662). Update `.local/ink.md` to name tokens instead of values.
6. Screenshot-compare pause, inventory, the HUD and a notice against the pre-W1 baseline.

**W2: surfaces (four parallel lanes, after W1).**

*P1 HUD* (`systems/nuikit_hud/web/src`, `systems/nuikit_voice`):
1. key-tile.tsx wraps Tile (fill → level, open → tag). Delete hud.css:2194-2345 and its 21 colour literals.
2. `.hud-gear` (2124-2150, cluster.tsx:249-392), `.hud-c-tell` (2169, compact.tsx:406) and the compass marks (`.hud-cardinal` 425, `.hud-tape-label` 355) become Tile.
3. Tag, flag, map tag, `.hud-chip`, the telltale strip and the HudChip warning (cluster.tsx:139) become Chip; delete the HudChip tile shape.
4. Money, job, fuel and ammo become IconText; the duty dot (527) becomes Chip dot.
5. Fuel, RPM and segment bars become Meter. Every `data-critical` (216, 2338), `data-low` (687, 1563) and `data-redline` (602) becomes `data-state="alert"`.
6. `.hud-arc*` and `.hud-c-gauge*` become Dial.
7. Type roles replace the overrides at 2100-2190 and the hand-repeated `.15em` pads.
8. Move to the scales: 53 gaps, 40 radii (9999px ×10, the line-34 fallback), 60 font sizes, 46 weights, 48 durations and 10 beziers.
9. Drop `filter: drop-shadow` (2263) and the soft shadow (1963). Use one icon stroke (ammo.tsx:14, icons.tsx:11).
10. Move the TSX literals onto tokens (key-tile.tsx:47, map.tsx:70/155, App.tsx:229), and delete the unused vital-chip and collapse-stack copies.

*P2 Menus* (`systems/nuikit_pause/web/src`, `addons/ox_inventory/web/src`):
1. PauseSheet becomes EdgeSheet `flush` with `back`; sheet.tsx keeps only the camera and stage logic. Delete pause.css:28-47 and 279-294.
2. SheetPage and SheetSection come from the registry (map.tsx:230, settings.tsx:56, keys.tsx:16, info.tsx:7, home.tsx:168).
3. MenuRow replaces home.tsx:174, keys.tsx:33, controls.tsx:95 and the item-menu items. Delete `min-h-11/12` and the pause.css:302 nudge.
4. ActionBar replaces home.tsx:57-79, the controls.tsx:108-154 tray (with one gap) and the Back Kbd (sheet.tsx:88, map.tsx:244).
5. ItemSlot replaces slot-tile.tsx:119, and `.inv-key` becomes Kbd sm. Delete the hover (app.css:500-508), the rarity gradient (89-92) and grayscale (93-96). Rarity is a hue rim; locked is `disabled`.
6. Chip replaces `.inv-count`, `.inv-price`, `.pause-blip-count`, the drag bubble and the duty dot (home.tsx:105).
7. Meter replaces `.inv-meter`, the sheet edge and SlotOutline, with one threshold (inventory-panel.tsx:99, slot-tile.tsx:112, item-image.tsx:34).
8. DialogShell replaces App.tsx:193 and controls.tsx:85; delete the app.css:490-496 leak.
9. EmptyState replaces map.tsx:269, settings.tsx:79, keys.tsx:27, home.tsx:181 and inventory-panel.tsx:42.
10. Controls move to h-control: Resume (App.tsx:142), search (map.tsx:262), `.inv-amount` (app.css:290) and Reset (settings.tsx:103).
11. Hygiene: blur (pause.css:19/38), gradients (pause.css:34/88), soft shadows (pause.css:96/224, app.css:222/408), 31 durations, 24 colour mixes, 5 pills and about 53 type literals.

*P3 Interactions* (`addons/{ox_lib,ox_target,qbx_*,Renewed-Banking,ox_doorlock,mm_radio,illenium-appearance}`, `systems/nuikit_screen`):
1. Delete the 8 copies of the panel recipe (scoreboard, Banking, idcard, doorlock, taxi, vehiclesales, illenium and ox_lib app.css).
2. DialogShell replaces ox_lib input-dialog.tsx:72 and alert-dialog.tsx:93 (with app.css:243-300), illenium App.tsx:206 and Banking money-dialog.tsx.
3. Notice replaces the ox_lib toast (app.css:297-345) and Banking's (App.tsx:49, 150-156).
4. ActionBar replaces list-menu.tsx:277, radial-menu.tsx:293, illenium :126, Banking :133, idcard :119, doorlock :261, taxi :157 and vehiclesales :275.
5. MenuRow replaces scoreboard :95, transactions.tsx:47, mm_radio screens.tsx:89-231 and taxi :138 / vehiclesales :72. Delete ox_lib app.css:272-277.
6. Chip dot replaces seven status dots (scoreboard :120, taxi :120, mm_radio :56/108/232, illenium :87, group.tsx:46).
7. EmptyState replaces Banking :320, illenium ped.tsx:87 and tattoos.tsx:77, and mm_radio :89/224.
8. EdgeSheet `anchor="upper"` replaces scoreboard :72, idcard :94 and taxi :113. Delete the sheet-motion copies and `--tgt-spring`.
9. form-field replaces mm_radio screens.tsx:266-335 and the doorlock helper text (App.tsx:322-382).
10. Colour: ox_lib lib/color.ts:8-20 maps onto roles. The idcard stocks (lib/nui.ts:47) and gradients (app.css:17-21) become a flat rim.
11. The mm_radio shell (radio.tsx:153-165) becomes Panel, and its 42 type literals go. nuikit_screen App.tsx:35-62 moves to `--nk-scale`.
12. Rename ox_lib's legacy motion class prefix (app.css:264-300) to `nk-*`.

*P4 Moments* (`systems/nuikit_{chat,death,loading,stress}`):
1. Chat: style.css:13-40 reads the kit tokens through one bridge. `--nk-px` stays only for 1080p scaling. Remove the five `!important`.
2. Chat: `.nk-tag` (124) becomes Chip, `.nk-note` (139) takes Notice styling and `.nk-presence` (176) becomes Chip dot. The caret's 9999px (381) goes. Radii (98-306) and shadows (101-300) move to tokens, and the text-shadows (87, 340) become `--world-shadow`.
3. Death: death.css's five `color-mix` (11-66) go. The font literal on line 57 becomes the title role, and the timings at 33/50/55 move to the ladder.
4. Death: App.tsx:36 takes the display role, the delays (40-113) use `--i`, and the hint (173-174) becomes an ActionBarItem.
5. Loading: the pill and `backdrop-blur-md` (App.tsx:218), lines 98 and 29, and app.css:6 move to tokens. The timings at 33/37/41/51 move to the ladder, and the rise uses `--nk-rise`.
6. Loading: the count-up (App.tsx:122-135) becomes TextRoll on the ladder, and `matchMedia` becomes `data-nk-motion`. Fix the stale comment at lib/utils.ts:183.
7. Stress: client.lua:14 notifies through the nuikit Notice (danger, hue stress, `--nk-notify-ms-danger`).
8. Exit, for every W2 lane: `nuikit check <dir>` passes at error level, then a screenshot pass.
