# nuikit design

The one design doc. Every nuikit screen is stock shadcn, coloured by the server's theme, proportioned and moved
by the rules here. Where this doc and the code disagree, the code wins and this doc gets fixed in the same commit.
Sources of truth next to it: `packages/create-nuikit/kit.css` (every default, once), `packages/core/src/spec`
(the token language; `design/levers.md` is generated from it), `registry/nuikit` (the components), `registry.json`.

**The standard was read off the two parts the owner called premium in game: the speedometer and the vitals.** Flat
solid fills, a few shapes reused, hard depth, two typographic voices, compact motion on one ladder, alignment held.
The goal is a game UI language, not a web app: rows you select like a GTA menu, keys that look pressable.

## 1. Principles

1. **Themes set values, never anatomy.** Every design decision is a `--nk-*` lever with a default in `kit.css`. A theme
   writes values into `@layer nk.theme`; a theme that needs a selector has found a missing lever. Enforced by
   `packages/core/test/themes-values-only.test.ts` and `nuikit check` `theme/values-only`.
2. **Colour only from tokens.** No literals, no palette classes, no `oklch()` or `color-mix()` in inline styles. Fixed
   colours only for what the theme cannot know: GTA's own palettes, item images, shadows.
3. **Stock shadcn is the foundation.** Compose the vendored new-york-v4 components (`vendor/shadcn`, never edited);
   nuikit's registry layer is composition, not forks. If shadcn has it, use it.
4. **One tile language.** Keys, icons, checked boxes, gears, vital chips, the selected row and the primary button are
   one Tile: a face in the theme's skew, a 1px rim, on a hard wall straight below. Depth is an offset plate, never a
   blur or a glow.
5. **Fill, not rings.** Status is a level filling, solid and vivid, with a leading edge. Progress is segmented or a
   fill, never a thick ring. No translucent washes by default (`--nk-fill-style: solid`; `soft` is the switch).
6. **Rows, not cards.** Inside a window everything is a row: icon tile, title, description, trail. No cards in cards.
   Rows never touch (`--nk-list-gap`), and one selection tile per list slides between them.
7. **Two voices.** A display voice for everything you scan (titles, labels, keys, numbers; Barlow Condensed italic
   caps in Default) and a body voice for sentences (Geist). Never a bold sans for a row title.
8. **Quiet and in sentence case.** Neutral surfaces, `primary` once per surface, colour carries meaning. No uppercase
   tracked labels in markup (a theme may uppercase through `--nk-type-*-case`), no eyebrows, no `A · B · C` strings.
9. **Motion with a purpose, on one ladder.** Transform and opacity only, `--nk-time-*` and `--nk-ease-*`, exits faster
   than entrances, nothing animates on its own unless it is live. Reduced motion keeps a fade of 100 ms or less and
   drops every slide; motion off is instant.
10. **Subtle over spectacular.** A camera keeps the player's view and moves in; nothing glows, pulses or breathes to
    be noticed. The HUD stays out of the way: chips and bare text on the `--nk-edge` margin, never panels.
11. **Replace native, fully.** A nuikit screen that stands in for a GTA one does everything the native did.
12. **Chromium 103 until 144 ships.** No `:has()` or `@container` for anything essential, no individual `translate`
    / `scale` / `rotate`, cubic-bezier only, `tw-animate-css` on every page, and never a transform animation on a
    centred dialog's own element (it overrides the centring; animate an inner wrapper).

## 2. Tokens and levers

The contract is [`tokens.md`](tokens.md); the catalog is [`design/levers.md`](design/levers.md) (generated). In short,
a UI reads shadcn's names unprefixed (`--background`, `--popover`, `--primary`, `--muted`, `--accent`, `--destructive`,
`--border`, `--ring`, `--radius`, `--font-sans`, `--font-mono`), the game families (`--role-*` for vitals, `--hue-*`,
`--brand*`, `--hud*`, `--scrim`, `--success` / `--warning` / `--info`), and the kit levers `--nk-<family>-<part>` in
four tiers that only reference upward:

| Tier | What | Example |
|---|---|---|
| identity | what a server chooses: palette, faces, scales, shape, type, surfaces, motion | `--nk-shape-skew`, `--nk-style-fill` |
| semantic | roles every component shares: the motion ladder, eases, plate, fill, accent, lines, depth | `--nk-time-base`, `--nk-plate-bg` |
| component | `--nk-<component>-<prop>` | `--nk-tile-wall`, `--nk-row-pad-x` |
| part | `--nk-<component>-<part>-<prop>`, the `data-slot` anatomy | `--nk-type-scan-pad` |

`compileTheme("")` fills the defaults (Graphite, the token default). A theme is any shadcn or TweakCN paste plus the
levers it wants; everything else is derived. `--nk-scale` and `--nk-motion` combine the theme with the player's prefs.

**The lever rule (Oct 27, 2026).** No new lever until a theme, a component or a server needs it. A lever nothing
reads (not a kit rule, not a component, not the compiler) is deleted, not kept for later:
`registry/nuikit/test/levers.test.ts` holds the line and lists the known debt. Today `kit.css` declares about 550;
themes set 74. A lever only kit rules read is still a lever (that is how a theme moves a rule); one nothing reads is
dead. Working the debt list down to zero is the standing cleanup item.

## 3. Scale and layout

`1rem = 16px` at 1080p and follows the game's height (floored at 12px so 720p and 4:3 stay readable, capped at
32px), times `--nk-scale`. Design at 1080p; test at 1280×720, 1920×1080 and 2560×1440. Sizes in rem, never px,
except hairlines and shadow offsets.

| | Values |
|---|---|
| Spacing | `--nk-space-*` (4, 8, 12, 16, 24 px) inside panels, times `--nk-density`; nothing in between |
| Screen edge | `--nk-edge` 1.5rem (16:10 1.25, 4:3 1) for anything anchored to or inset from an edge |
| Rows and controls | `--nk-h-row` 3rem for a row in a sheet, `--nk-h-field` 2.75rem, `--nk-h-control` 2.25rem, keys and chips smaller |
| Type | 13 label, 16 body, 17–18 panel title, 23 section, 36+ for a number that is the point; 400 body, 500 labels, 600 titles |
| Icons | `--nk-icon-md` 1rem in a 2rem Tile column; a row without an icon keeps the column |
| Radius | four steps: key .25, chip .375, control .5, surface .75rem (`--nk-r-*`); no `rounded-full` on new work |

**Layout model** (`registry/nuikit/ui/{screen,zone,region,grid}.tsx`, `packages/core/src/viewport.ts`): `<Screen>` is
the page root and holds a 16:9 content box, centred on an ultrawide (`bleed` for full width) with a safe area inside.
`<Zone at>` is one of nine places or four edges; a flex column that grows toward the centre, `--nk-zone-inset` from
the safe area; items stack and never overlap; `clear` moves it clear of what other UIs published there and `publish`
shares its rect through `NUI.zone`. `Region` is a column with header, scrolling body and pinned footer; Panel, EdgeSheet
and DialogShell are Regions on a surface. `Grid` is a grid of slots with arrow-key navigation by position.
`VIEWPORTS` in core is the one aspect table; kit.css mirrors it and a test keeps them equal. `nuikit_hud`'s corners are
Zones; the pause menu is a bleeding Screen with one Region column.

## 4. Surfaces

**Every window is a shadcn Sheet** (`edge-sheet` wraps it). Placement follows what the game is doing behind it:

| Placement | When | Shape |
|---|---|---|
| **Flush** (`variant="flush"`) | the game is paused or replaced: pause, full map, character select | touches top, bottom and its screen edge; a hairline on the open edge; a scrim falloff; content in an inner column (48px from the screen edge, 24px from the open edge) |
| **Floating** (the default) | the game keeps running: inventory, bank, shops, job menus, context menus, dialogs | inset `--nk-edge` from top, bottom and its side; a border all round; the theme's corner shape; the panel shadow |
| **Tray** | actions and key hints for the window above it | a floating bar along the bottom, never touching the screen bottom |

Flush is reserved for one top-level system screen; everything else floats, picks a side (right for menus opened from the
world, left for "your stuff") and never designs its own frame. Inside a sheet: 48px rows with a hairline between
sections (`nk-caption` titles), one ScrollArea column with a gutter, sub-pages that swap in place with a back row (Escape
goes back before it closes), **exactly one primary action** in the actions row, key hints as Kbd next to their action,
a whole-sheet level traced along the header's hairline (`meter`). A sheet never closes itself: outside clicks, focus
and Escape belong to the surface and its resource. `nk-panel` stays for small popovers that are not windows.

## 5. The baseline, lever by lever

- **Spacing.** Surface padding `--nk-pad-surface` (space-6); header space-6/6/4, footer space-4/6/6 with no rule above it.
  Rows: `--nk-row-pad-y` space-2, `--nk-row-pad-x` space-3, `--nk-row-gap` space-4; rows sit space-1 apart with no
  hairlines between them.
- **Type.** Titles, row titles, labels, keys, buttons and numbers in the display voice (`--nk-type-{title,label,scan,num}-*`,
  `--nk-row-title-size` 1rem); descriptions in the body voice (`--nk-row-desc-size` .875rem, muted). Notice titles are
  sentence-led whatever the script sent.
- **Selection and focus: one language.** No focus rings anywhere: keyboard, controller and programmatic focus render the
  pointer's hover state (`data-lit`). The lit row, menu item or tab **is** the primary keycap Tile (face in the theme's
  skew over the wall, `--nk-tile-radius`); one `SelectionTile` per list slides between items by transform, a size change
  by FLIP, never a height or width animation; a held key glides fast then jumps. The one exception: a text field with the
  caret keeps a 1px rim (`--nk-focus-rim`), and checkboxes and switches light the same rim.
- **Buttons.** The primary is a keycap: face on wall, hover and focus raise it a pixel, a press sinks it. Outline is a
  hairline rim that tints; ghost and secondary take the accent. Labels in the scan voice.
- **Progress.** `ProgressRing` is a Dial with `--nk-ring-segments` (24) and `--nk-ring-gap` (4°) on a dark disc; a timed
  ring lights one segment at a time on the compositor. Bars are a Fill: solid, a leading edge (`--nk-fill-edge`), alert
  past a threshold.
- **Fills.** `--nk-fill-style: solid` (opacity 1) covers progress, meters, the vital liquid, overlay fills and
  selection; `soft` is .42. An icon over a solid fill keeps a dark ink copy clipped to the covered part.
- **Surfaces.** One plate (`--nk-plate-*`): flat, a hairline, a hard drop. One hairline under a header, none between
  rows or above a footer. No blur, no soft shadow, no gradient that carries colour.
- **Motion ladder.** snap 90 (press), fast 120 (hover, a face rising), base 180 (row lift, rim), slow 280 (sheets,
  dialogs, a tile landing), fill 420 (levels), pulse 1000 (alert); exits at 0.7×. Things land, open, then speak.
  Entrances: a sheet slides from its edge, rows stagger after it on the first open only; a sub-page fades in place.
  Values that change in place roll (`TextRoll`, `NumberRoll`: vertical only, alignment per layer, width changes move
  the neighbours). Keyboard and controller state is instant. Idle cost is zero: a threshold blinks twice, never pulses;
  a finished animation leaves nothing running.
- **Graphite under the baseline.** Graphite keeps its palette, fonts and rounded meters; everything else above applies
  (skew 0, so its keycaps are straight).

## 6. Components: the network

The registry is a few **foundation** primitives driven by levers and **composites** that configure them with props;
**blocks** compose composites into whole screens. A theme restyles a primitive once and every composite follows; a
composite never draws its own bar, key, chip or gauge. `registry.json` `meta` (tier, group, hidden, variants) drives the
site; `registry/nuikit/test/registry-meta.test.ts` keeps it honest, `composition.test.tsx` holds the contracts below,
`anatomy.test.tsx` renders every item under every theme and compares the `data-slot` tree.

| Foundation | What it is | Levers |
|---|---|---|
| **Tile** (+ `Kbd`) | the keycap: keys, icon tiles, gears, checked boxes, the selection | `--nk-tile-*`, `--nk-h-key/chip/control`, `--nk-r-key` |
| **Fill** | the one level bar: holds, sweeps, meters, timers, edges (`toneVars` is the tone and hue vocabulary) | `--nk-fill-*`, `--nk-time-fill` |
| **Chip** | a short status on one line, `material` panel or hud | `--nk-chip-*`, `--nk-h-chip` |
| **Text** / **IconText** | the type roles and the value ladder as one component | `--nk-type-<role>-*`, `--nk-text-*` |
| **Dial** | one arc geometry: gauges (240°) and rings (360°) | `--nk-gauge-*`, `--nk-fill-*` |
| **Stack** / **Cluster** | layout on the gap levers | `--nk-gap-*` |
| **Panel** | the floating surface with header, body, footer | `--nk-panel-*` |
| **SelectionTile** | the one selection mark of a list, tabs or a menu | `--nk-tile-*`, `--nk-list-gap`, `--nk-indicator-*` |
| **ActionBar** | key hints, back and close: Kbd Tiles, a label, a hold Fill | `--nk-gap-items` |
| **useLinearRun** | the one timed run: linear Web Animations on one start time, completion from a timer | `data-nk-motion` |

Composites and what they compose: Meter (Fill, useLinearRun), ProgressRing and Speedometer (Dial, Tile, Fill), Countdown
and Notice (Fill, useLinearRun), KeyPrompt and SkillCheck (Kbd Tiles, Fill), EdgeSheet and DialogShell (ActionBar, Fill,
Stack over shadcn Sheet / Dialog), Confirm (Panel, no Radix: Escape goes through surfaces), MenuRow (Tile column,
SelectionTile, Meter), Stat and Money (Text), PlayerCard (Panel, Chip, Stat), VitalChip (TextRoll, its own shape engine),
RadialMenu, ItemSlot, FormField, SmoothInput, NuiImage (their own geometry, no overlap). Entrance and stagger motion live in
`nuikit-core/react` and `nuikit-core/motion`: runtime, not registry.

**Listed on the site (20):** Tile, Fill, Chip, Panel, ActionBar, Dial, TextRoll; MenuRow, RadialMenu; Meter, Speedometer,
ProgressRing; EdgeSheet, Confirm; Notice, KeyPrompt, SkillCheck; FormField; VitalChip, Stat. Everything else is hidden with
a reason in `meta.hiddenReason` (a helper, an internal frame, or "use X instead").

## 7. The component checklist

Before a registry component or hook merges:

1. Colour from tokens, sizes in rem on the kit scale, every look a server might want different behind a lever with its
   default as the `var()` fallback. Channels (`--x-rgb`, `--x-a`) stay in CSS, never in TSX.
2. Composes vendored shadcn and `nk-*` utilities; never redefines an `nk-*` name or adds a local `@utility nk-*`. Every
   class list goes through the kit-aware `cn()` (generated into `lib/utils.ts`); a size variant sets font size, leading
   and gap together, text-* before leading-*.
3. `cva` variants exported as `<name>Variants` with `defaultVariants`; shared axes `size` and `tone`; values in pairs
   (`value` + `onValueChange`, `defaultValue`) so Lua can drive them; sub-components for structure, `className` on
   every part; `asChild` only around a Radix part.
4. Every state reachable from props (default, hover, focus, active, disabled, loading, error, empty, over-threshold) and
   shown on `/components`; the root has `data-slot="<name>"`, parts `data-slot="<name>-<part>"`, states as `data-*`.
5. Motion on the ladder, transform and opacity only, instant for keyboard and controller, nothing at `--nk-motion: 0`.
6. Works by keyboard (arrows move, Enter and Space act); Escape goes through surfaces, never a local handler that posts
   close; the highlight can be driven from Lua (`active` + `inert`); never calls focus natives. `nuikit check` fails
   `escape/adhoc` and `focus/direct`.
7. Meaning never by colour alone; `role="status"`, `role="progressbar"` with values; reading text at least 16px,
   labels at least 13px, in every theme.
8. A `registry.json` entry with accurate dependencies and `meta` (`since`, `status`, `group`, `tier`); tests for any logic
   in `registry/nuikit/test/`; `pnpm sync` after (copies in systems and addons are never edited by hand); a changeset
   when it changes for users.

**Deprecation, until 1.0 (Oct 27, 2026).** Nobody runs nuikit in production, so a replaced component is deleted in the
same commit as its replacement, with the rename in the release notes. No aliases, no `removeIn` windows. The policy with
two-minor windows and codemods returns at 1.0.

## 8. Naming

One name for one thing, everywhere. Nothing is named after a server or a person.

| Thing | Rule | Example |
|---|---|---|
| Theme | a file in `packages/core/themes/`; id = base name, lowercase kebab; display name title-cased | `neon-pop.css` → "Neon Pop" |
| Treatment | one lowercase word, a value of `--nk-treatment` | `tile`, `soft` |
| Kit token | `--nk-<family>-<part>[-<state>]`; the family is the thing, not the page | `--nk-tile-wall` |
| Kit class | `nk-<name>`, declared once in `kit.css` | `.nk-row` |
| Page-local class or property | the surface's own prefix, only in its CSS | `.hud-compass`, `--inv-gap` |
| Site-only class | `site-*`, never `nk-*` | `.site-display` |
| Component | one concept; kebab file, PascalCase export, `data-slot` = file name | `edge-sheet.tsx` → `EdgeSheet` |
| Data attribute | `data-slot` (what), `data-state` (how), `data-nk-*` (kit switches) | `data-state="alert"` |
| Keyframes | `nk-<name>` in the kit, `nk-theme-<name>` in a theme | `nk-theme-reveal` |
| Files | kebab-case source, `snake_case` resources (`nuikit_<area>`), lowercase docs | `systems/nuikit_hud` |
| Convar / config | `nuikit_<thing>` server-side; `Config.<thing>` in a resource | `setr nuikit_identities` |

## 9. Universal glue

nuikit connects to what servers already have and falls back silently. Images by convention (`docs/images.md`): one
resolver for items, weapons, vehicles and clothing, trying ox_inventory's and the qb-style paths first, then the
server's own templates (`setr nuikit_images_item …`), then an icon; nothing in a screen depends on an image loading.
Adapters and overrides read the data the server has (`bridge.lua`, the resource's protocol) and speak its events; a
server never needs nuikit's format to use nuikit's screens.

## 10. Checking it

- `nuikit check <folder> --level 3` on every page (CI). Rules of note: `theme/values-only`, `selection/local`,
  `kit/local-concept`, `escape/adhoc`, `focus/direct`, `color/*`.
- Tests: `themes-values-only`, `anatomy`, `composition`, `levers`, `registry-meta`, `cn` (registry and core).
- Look: `pnpm look <web dir> [url] --viewport 3440x1440 --themes default,neon-pop`, and in the browser the devtools
  (`` ` ``) "Scene & size" picker. Anything visual: look at the PNGs in every theme before pushing.
- The owner's in-game checkpoint is the only design review. A spec section never replaces a screen in the game.
