# nuikit design

The one design doc: the rules every nuikit screen follows and the component network that carries them. Every screen is
stock shadcn, coloured by the server's theme, proportioned and moved by the rules here. Where this doc and the code
disagree, the code wins and this doc is fixed in the same commit. The theme contract (token names, the compiler,
distribution, prefs, fonts) is [`tokens.md`](tokens.md); every lever with its default is in
[`design/levers.md`](design/levers.md), generated from `packages/core/src/spec`.

The goal is a game UI language, not a web app: rows you select like a GTA menu, keys that look pressable, solid fills, a
few shapes reused, hard depth, two typographic voices, compact motion on one ladder, alignment held.

## 1. Principles

1. **Themes set values, never anatomy.** Every design decision is a lever with a default. A theme writes values into
   `@layer nk.theme`; a theme that needs a selector has found a missing lever. Enforced by
   `packages/core/test/themes-values-only.test.ts` and `nuikit check` `theme/values-only`.
2. **Colour only from tokens.** No literals, no palette classes, no `oklch()` or `color-mix()` in inline styles. Fixed
   colours only for what the theme cannot know: GTA's own palettes, item images, shadows.
3. **Stock shadcn is the foundation.** Compose the vendored new-york-v4 components (`vendor/shadcn`, never edited);
   nuikit's registry is composition, not forks. If shadcn has it, use it.
4. **One control face, flat by default.** Keys, icon marks, checked boxes, gears, vital chips, the lit row and the
   primary button draw the same face (`--nk-control-*`): upright, a 1px rim, no wall, no plate. A theme may slant it
   (`--nk-shape-skew`) or set it on a wall; the Keycap theme does both. Depth is never a blur or a glow.
5. **Fill, not rings.** Status is a level filling, solid, with a leading edge. Progress is segmented or a fill, never a
   thick ring. No translucent washes by default (`--nk-style-fill: solid`; `soft` is the switch).
6. **Rows, not cards.** Inside a window everything is a row: icon, title, description, trail. No cards in cards. Rows
   never touch (`--nk-list-gap`), and one Selection per list slides between them.
7. **Two voices.** A scan voice for what you read at a glance (keys, titles, labels, numbers) and a body voice for
   sentences, both upright and in sentence case. Slant and caps come only from the voices' levers, never from markup.
8. **Quiet.** Neutral surfaces, `primary` once per surface, colour carries meaning. No uppercase tracked labels in
   markup, no eyebrows, no `A · B · C` strings.
9. **Motion with a purpose, on one ladder.** Transform and opacity only, `--nk-time-*` and `--nk-ease-*`, exits faster
   than entrances, nothing animates on its own unless it is live. Reduced motion keeps a fade of 100 ms or less and
   drops every slide; motion off is instant.
10. **Subtle over spectacular.** A camera keeps the player's view and moves in; nothing glows, pulses or breathes to
    be noticed. The HUD stays out of the way: chips and bare text on the screen edge, never panels.
11. **Replace native, fully; connect to what is there.** A screen that stands in for a GTA one does everything the native
    did. Data comes from what the server already runs (`bridge.lua`, the resource's protocol, the image resolver in
    [`images.md`](images.md)), and everything falls back silently.
12. **Chromium 103 until 144 ships.** No `:has()` or `@container` for anything essential, no individual `translate` /
    `scale` / `rotate`, cubic-bezier only, `tw-animate-css` on every page, and never a transform animation on a centred
    dialog's own element (it overrides the centring; animate an inner wrapper).

## 2. Tokens and levers

The language is the token file `packages/core/tokens/nuikit.levers.json` (W3C Design Tokens; paths such as
`control.face.radius` carry no CSS prefix) plus the primitives' anatomy (§6). Its public surface is the **36 core
identity levers** listed first in [`design/levers.md`](design/levers.md): palette, faces, density, type ratio, case and
slant, skew, chamfer and hairline, surface tint and elevation, material opacities, text shadow on the game, motion, which
drawing fills, levels, gauges and focus use, and the alert threshold. Everything else derives from them. `--nk-` is the
kit's CSS emission of the paths; shadcn's own names stay unprefixed because they are the server's theme. Tiers, naming
and the compiler are in [`tokens.md`](tokens.md).

`compileTheme("")` is the flat baseline: upright faces, no wall or plate, solid fills, Geist for both voices. The
shipped themes are short value diffs on it (`packages/core/themes/`):

| Theme | What it changes |
|---|---|
| **Default** | The flagship and the stock `nuikit/theme.css`: black and white, Barlow Condensed upright for the scan voice, Geist for sentences |
| **Neon Pop** | Default with a vivid palette: a blue-violet-rose accent gradient, a hue per vital |
| **Keycap** | Default's palette with slanted faces on walls and Barlow Condensed italic caps |

**The lever rule.** No new lever until a theme, a component or a server needs it. A lever nothing reads (not a kit rule,
not a component, not the compiler) is deleted; `registry/nuikit/test/levers.test.ts` keeps the dead and undeclared
lists empty. A lever only kit rules read is still a lever: that is how a theme moves a rule.

## 3. Type and icons

**Text styles.** Eleven styles, one per role, generated into kit.css from `packages/core/src/spec/text-styles.ts`:
`nk-text-display`, `-section`, `-title`, `-label`, `-caption`, `-scan`, `-num`, `-figure`, `-hud`, `-body`, `-desc`
(the older `nk-display`, `nk-title`, `nk-label`, `nk-caption`, `nk-scan`, `nk-num`, `nk-body` are aliases). Each is a
voice (`--nk-type-<voice>-*`: face, slant, weight, tracking, case, overhang pad) at a size and a leading; the table is
in [`design/levers.md`](design/levers.md). A component or screen picks a style, or in its own CSS a voice's variables,
and never sets a font-style, family, weight, tracking or case of its own. A site test (`apps/www/src/tokens.test.ts`)
fails italic or a font-style anywhere outside the voices. A new role is a row in the table. Reading text is at least
16px and labels at least 13px in every theme; notice titles are sentence-led whatever the script sent.

**Icons.** One set: Hugeicons (free, stroke-rounded) under lucide's names, in `registry/nuikit/ui/icons.tsx`.
`scripts/icons.mjs` generates it during `pnpm sync` from the names the sources import; a name Hugeicons spells
differently goes in its `RENAME` table. `lucide-react` resolves to it in every UI, the site and the template, so stock
shadcn draws Hugeicons unedited. Sizes `--nk-icon-sm/md/lg`, stroke `--nk-icon-stroke` (1.5).

## 4. Scale and layout

`1rem = 16px` at 1080p and follows the game's height (floored at 12px so 720p and 4:3 stay readable, capped at 32px),
times `--nk-scale`. Design at 1080p; test at 1280×720, 1920×1080 and 2560×1440. Sizes in rem, never px, except
hairlines and shadow offsets.

| | Values |
|---|---|
| Spacing | `--nk-space-1/2/3/4/6/8` (4 to 32px) times `--nk-density`; nothing in between |
| Screen edge | `--nk-screen-edge` 1.5rem (16:10 1.25, 4:3 1) for anything anchored to or inset from an edge |
| Heights | `--nk-height-row` 3rem, `-field` 2.75rem, `-control` 2.25rem, `-chip` 1.75rem, `-key` 1.5rem |
| Icons | `--nk-icon-md` 1rem in a 2rem icon column (`--nk-row-icon-box`); a row without an icon keeps the column |
| Radius | four steps from `--radius`: `--nk-radius-key`, `-chip`, `-control`, `-surface`; no `rounded-full` on new work |
| Rows | `--nk-row-pad-y` space-2, `--nk-row-pad-x` space-3, `--nk-row-gap` space-4; rows sit `--nk-list-gap` apart, no hairlines between |

**Layout model** (`registry/nuikit/ui/{screen,zone,region,grid}.tsx`, `packages/core/src/viewport.ts`): `<Screen>` is
the page root and holds a 16:9 content box, centred on an ultrawide (`bleed` for full width) with a safe area inside.
`<Zone at>` is one of nine places or four edges: a flex column that grows toward the centre, `--nk-zone-inset` from the
safe area; items stack and never overlap; `clear` moves it clear of what other UIs published there and `publish` shares
its rect through `NUI.zone`. `Region` is a column with header, scrolling body and pinned footer; Panel and EdgeSheet are
Regions on a surface. `Grid` is a grid of slots with arrow-key navigation by position. `VIEWPORTS` in core is the one
aspect table; kit.css mirrors it and a test keeps them equal.

## 5. Surfaces, states and motion

**Every window is a shadcn Sheet** (`edge-sheet` wraps it). Placement follows what the game is doing behind it:

| Placement | When | Shape |
|---|---|---|
| **Flush** (`variant="flush"`) | the game is paused or replaced: pause, full map, character select | touches top, bottom and its screen edge; a hairline on the open edge; a scrim falloff; content in an inner column |
| **Floating** (the default) | the game keeps running: inventory, bank, shops, job menus, dialogs | inset by the screen edge on three sides; a border all round; the theme's corner shape; the panel shadow |
| **Tray** | actions and key hints for the window above it | a floating bar along the bottom, never touching the screen bottom |

Flush is for one top-level system screen; everything else floats, picks a side (right for menus opened from the world,
left for "your stuff") and never designs its own frame. Inside a sheet: rows, a hairline under the header and none
between rows or above the footer, one ScrollArea column, sub-pages that swap in place with a back row (Escape goes back
before it closes), **exactly one primary action**, key hints as Kbd next to their action, a whole-sheet level traced
along the header's hairline. A sheet never closes itself: outside clicks, focus and Escape belong to the surface and its
resource. `nk-panel` is for small popovers that are not windows. Surfaces are one plate (`--nk-plate-*`): flat, a
hairline, a hard drop; no blur, no soft shadow, no gradient that carries colour.

**Selection and focus.** No focus rings: keyboard, controller and programmatic focus render the pointer's hover state
(`data-lit`). The lit row, menu item or tab is the primary control face (`--nk-control-primary-*`). One `Selection` per
list slides between items by transform, a size change by FLIP, never a height or width animation; a held key glides
fast then jumps. The exception: a text field with the caret keeps a 1px rim in `--ring`, and checkboxes and switches
light the same rim. Stock shadcn Tabs keep their stock look; `selection-tabs` is the sliding one.

**Buttons.** The primary is the control face: hover and focus raise it a pixel, a press sinks it. Outline is a hairline
rim that tints; ghost and secondary take the accent. Labels in the scan voice.

**Levels.** Bars are a Fill: solid, a leading edge (`--nk-fill-edge`), alert past `behavior.alert`. `ProgressRing` is a
Dial with `--nk-ring-segments` (24) and `--nk-ring-gap` (4°); a timed ring lights one segment at a time on the compositor.
An icon over a solid fill keeps a dark copy clipped to the covered part.

**Motion ladder.** snap 90 (press), fast 120 (hover), base 180 (row lift, rim), slow 280 (sheets, dialogs), fill 420
(levels), pulse 1000 (alert); exits at 0.7×. Things land, open, then speak: a sheet slides from its edge, rows stagger
after it on the first open only, a sub-page fades in place. Values that change in place roll (`TextRoll`, `NumberRoll`:
vertical only, width changes move the neighbours). Keyboard and controller state is instant. Idle cost is zero: a
threshold blinks twice, never pulses; a finished animation leaves nothing running.

## 6. Components: the network

**Primitives are DOM contracts.** Each is an anatomy (the `data-slot` tree in render order), the state variables kit
rules set per state (`data-state`, `data-lit`, `--nk-<component>-now-*`) and the levers it reads; the primitives table
in [`design/levers.md`](design/levers.md) is generated from the spec. A renderer that emits that anatomy and reads those
levers is conformant whatever it is written in; `nuikit check` judges the DOM. The React registry is the reference
renderer.

The registry is nuikit's addition to shadcn, in tiers that only compose downward (`registry-meta.test.ts`, "the tiers"):

| Tier | What it is | May compose |
|---|---|---|
| **Base** | stock shadcn new-york-v4 (`vendor/shadcn`, never edited) | itself |
| **Foundation** | a drawing primitive driven by levers, universal to game UI | base, foundations |
| **Composite** | a FiveM-universal piece configured by props | base, foundations, composites |
| **Block** | a whole screen (`registry/nuikit/blocks`: garage, inventory, pause, death…) | anything |

A theme restyles a foundation once and every composite and block follows; a composite never draws its own bar, key, chip
or gauge. Nothing ships in `ui/` without a user: a component no block or system composes is deleted (decision 54).

| Foundation | What it is | Levers |
|---|---|---|
| **Glyph** (+ `Kbd`) | a legend on the control face: keys, icon marks, gears, checked boxes | `--nk-control-*`, `--nk-height-key/chip/control`, `--nk-radius-key` |
| **Icons** | the one icon set (§3) | `--nk-icon-*` |
| **Selection** | the one mark of a list, tabs or a menu, sliding to the lit item | `--nk-control-primary-*`, `--nk-selection-*`, `--nk-list-gap` |
| **Fill** | the one level bar: holds, sweeps, meters, timers (`toneVars` is the tone vocabulary) | `--nk-fill-*`, `--nk-time-fill` |
| **Chip** | a short status on one line, on a panel or the HUD | `--nk-chip-*`, `--nk-height-chip` |
| **Text** / **IconText** | the text styles as one component; an icon and text on one centre line | `--nk-type-<voice>-*`, `--nk-text-*` |
| **TextRoll** | text and numbers that roll to their next value | `--nk-time-*` |
| **Dial** | one arc geometry: gauges (240°) and rings (360°) | `--nk-gauge-*`, `--nk-ring-*`, `--nk-fill-*` |
| **Panel** | the floating surface with header, body, footer | `--nk-panel-*` |
| **ActionBar** | key hints, back and close: Kbd, a label, a hold Fill | `--nk-gap-*` |
| **Screen** / **Zone** / **Region** / **Grid** | where things sit (§4) | `--nk-screen-*`, `--nk-zone-*`, `--nk-region-*` |
| `useLinearRun` (hook) | the one timed run: linear Web Animations on one start time, completion from a timer | `data-nk-motion` |

Composites and what they compose: Meter (Fill, useLinearRun), ProgressRing and Speedometer (Dial, Glyph, Fill), Countdown
and Notice (Fill, useLinearRun), KeyPrompt and SkillCheck (Kbd, Fill), EdgeSheet (ActionBar, Fill over shadcn Sheet),
Confirm (Panel; Escape goes through surfaces), MenuRow (Glyph, Selection, Meter), SelectionTabs (Selection over shadcn
Tabs), Stat and Money (Text), PlayerCard (Panel, Chip, Stat), VitalChip (TextRoll, CollapseStack, Glyph), EmptyState (Glyph),
RadialMenu, ItemSlot, FormField, SmoothInput, NuiImage, Stepper. Entrance and stagger motion live in
`nuikit-core/react` and `nuikit-core/motion`: runtime, not registry. `registry.json` `meta` (tier, group, hidden,
variants) drives the site; a hidden item carries its reason in `meta.hiddenReason`.

**Adding one.** `node scripts/new-component.mjs <name> "Title" --tier foundation|composite --group "<group>"` writes the
file with the spec header (role, anatomy, props, rules), a test and the `registry.json` item; the suite then says what
is missing (its anatomy case, its demo). A component is done when every state is reachable from props and shown on
`/components`.

## 7. The component checklist

Before a registry component or hook merges:

1. Colour from tokens, sizes in rem on the kit scale, every look a server might want different behind a lever with its
   default as the `var()` fallback. Channels (`--x-rgb`, `--x-a`) stay in CSS, never in TSX.
2. Composes vendored shadcn, `nk-*` utilities and `nk-text-*` styles; never redefines an `nk-*` name. Every class list
   goes through the kit-aware `cn()` (generated into `lib/utils.ts`).
3. `cva` variants exported as `<name>Variants` with `defaultVariants`; shared axes `size` and `tone`; values in pairs
   (`value` + `onValueChange`, `defaultValue`) so Lua can drive them; `className` on every part; `asChild` only around
   a Radix part.
4. Every state reachable from props (default, hover, focus, active, disabled, loading, error, empty, over-threshold) and
   shown on `/components`; the root has `data-slot="<name>"`, parts `data-slot="<name>-<part>"`, states as `data-*`.
5. Motion on the ladder, transform and opacity only, instant for keyboard and controller, nothing at `--nk-motion: 0`.
6. Works by keyboard (arrows move, Enter and Space act); Escape goes through surfaces, never a local handler that posts
   close; the highlight can be driven from Lua (`active` + `inert`); never calls focus natives.
7. Meaning never by colour alone; `role="status"`, `role="progressbar"` with values.
8. A `registry.json` entry with accurate dependencies and `meta` (`since`, `status`, `group`, `tier`); tests for any
   logic in `registry/nuikit/test/`; a changeset when it changes for users.

Until 1.0 a replaced component is deleted in the same commit as its replacement, with the rename in the release notes:
no aliases, no deprecation windows.

**Checking it.** `nuikit check <folder> --level 3` on every page in CI (`theme/values-only`, `selection/local`,
`kit/local-concept`, `escape/adhoc`, `focus/direct`, `color/*`). Tests: `themes-values-only`, `spec-rules`, `anatomy`,
`composition`, `levers`, `registry-meta`, `cn`, and the site's `tokens.test.ts`. `scripts/check-built-classes.mjs`
fails CI when a built UI lost a registry component's classes. Anything visual: `pnpm look <web dir>` and look at the
PNGs in every theme before pushing. The owner's in-game checkpoint is the only design review.

## 8. Naming

One name for one thing, everywhere. Nothing is named after a server or a person.

| Thing | Rule | Example |
|---|---|---|
| Theme | a file in `packages/core/themes/`; id = base name, lowercase kebab; display name title-cased | `neon-pop.css` → "Neon Pop" |
| Kit token | `--nk-<family>-<part>[-<state>]`; the family is the thing, not the page | `--nk-control-wall` |
| Kit class | `nk-<name>`, declared once in `kit.css` | `.nk-row`, `.nk-text-title` |
| Page-local class or property | the surface's own prefix, only in its CSS | `.hud-compass`, `--inv-gap` |
| Site-only class | `site-*`, never `nk-*` | `.site-display` |
| Component | one concept; kebab file, PascalCase export, `data-slot` = file name | `edge-sheet.tsx` → `EdgeSheet` |
| Data attribute | `data-slot` (what), `data-state` (how), `data-nk-*` (kit switches) | `data-state="alert"` |
| Keyframes | `nk-<name>` in the kit, `nk-theme-<name>` in a theme | `nk-theme-reveal` |
| Files | kebab-case source, `snake_case` resources (`nuikit_<area>`), lowercase docs | `systems/nuikit_hud` |
| Convar / config | `nuikit_<thing>` server-side; `Config.<thing>` in a resource | `setr nuikit_identities` |
